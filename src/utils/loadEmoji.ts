
import fs from "fs";

import path from "path";
import { findProjectRoot } from "./tools.js";
import { CustomClient } from "../index.js";
import axios from 'axios';
import sharp from "sharp";

import ffmpeg from "fluent-ffmpeg";



export async function loadEmojis(client: CustomClient) {


  const emojiPath = path.join(findProjectRoot(), "emojis");
  const readDir = await fs.readdirSync(emojiPath);
  const emojis = await client.application.emojis.fetch().catch((err) => null);

  const unavailableEmojis = readDir.filter((emoji) => !emojis.find((e) => e.name === emoji.split(".")[0]));
  unavailableEmojis.forEach(async (emoji) => {


    client.application.emojis.create({
      attachment: path.join("./emojis", emoji),
      name: emoji.split(".")[0],



    }).then((emoji) => {
      console.log(`Emoji ${emoji.name} created`);
    }).catch((err) => {
      console.log(`Error creating emoji ${emoji}: ${err.message}`);
    })


  })

}






export async function createEmojiFromUrl(
  client: CustomClient,
  emojiUrl: string,
  emojiName: string,
  roundImage: boolean = false,
  cropImage: boolean = false
): Promise<string | null> {
  try {
    let uniqueEmojiName = emojiName;
    let emojiCache = client.application.emojis.cache.find(
      (e) => e.name.trim().toLowerCase() === uniqueEmojiName.trim().toLowerCase()
    );

    // If emoji already exists, generate a unique name
    if (emojiCache) {
      const timestamp = Date.now();
      uniqueEmojiName = `${emojiName}_${timestamp}`;
      emojiCache = client.application.emojis.cache.find(
        (e) => e.name.trim().toLowerCase() === uniqueEmojiName.trim().toLowerCase()
      );
    }

    if (emojiCache) return emojiCache.toString();

    // Fetch emoji image or video
    const response = await axios.get(emojiUrl, { responseType: "arraybuffer" });

    const isMp4 =
      emojiUrl.endsWith(".mp4") ||
      response.headers["content-type"]?.includes("video/mp4");

    let buffer: Buffer;

    if (isMp4) {
      // If it's a video, extract the first frame with optional cropping and rounding
      buffer = await extractFirstFrame(response.data, 128,emojiName, roundImage, cropImage);
    } else {
      const size = 128; // Final size of the emoji

      let image = sharp(response.data).resize(size, size);
      
      if (cropImage) {
        const metadata = await sharp(response.data).metadata();
        if (!metadata.width || !metadata.height) {
          throw new Error("Invalid image metadata.");
        }

        // Scale factors based on original 512px reference
        const baseSize = 512;
        const scaleX = metadata.width / baseSize;
        const scaleY = metadata.height / baseSize;

        const baseExtract = { left: 68, top: 66, width: 390, height: 390 };

        // Scale extraction area dynamically
        const extractRegion = {
          left: Math.round(baseExtract.left * scaleX),
          top: Math.round(baseExtract.top * scaleY),
          width: Math.round(baseExtract.width * scaleX),
          height: Math.round(baseExtract.height * scaleY),
        };

        // Ensure extract values are within image bounds
        extractRegion.left = Math.min(extractRegion.left, metadata.width - 1);
        extractRegion.top = Math.min(extractRegion.top, metadata.height - 1);
        extractRegion.width = Math.min(extractRegion.width, metadata.width - extractRegion.left);
        extractRegion.height = Math.min(extractRegion.height, metadata.height - extractRegion.top);

        image = image.extract(extractRegion);
      }

      if (roundImage) {
        const circleMask = Buffer.from(
          `<svg width="${size}" height="${size}">
              <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
          </svg>`
        );
       

        image = image.composite([{ input: circleMask, blend: "dest-in" }]);
      }

      buffer = await image.toFormat("png").toBuffer();
    }

    // Create the emoji
    const createdEmoji = await client.application.emojis.create({
      attachment: buffer,
      name: uniqueEmojiName,
    });

    return createdEmoji.toString();
  } catch (error) {
    console.error(`Error creating emoji ${emojiName}: ${error.message}`);
    return null;
  }
}



export function extractFirstFrame(
  videoBuffer: Buffer,
  size: number = 128,
  name:string,
  roundImage: boolean = false,
  cropImage: boolean = false,

): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const randomName = Math.random().toString(36).substring(2, 10);
    const projectRoot = findProjectRoot();
    const tempVideoPath = path.join(projectRoot, "images", `${name}.mp4`);
    const tempImagePath = path.join(projectRoot, "images", `${name}.png`);

    fs.writeFileSync(tempVideoPath, videoBuffer);

    ffmpeg(tempVideoPath)
      .on("end", async () => {
        try {
          if (!fs.existsSync(tempImagePath)) {
            return reject(new Error("Failed to extract frame: Image file was not created."));
          }

          const rawBuffer = fs.readFileSync(tempImagePath);
          fs.unlinkSync(tempVideoPath);
          fs.unlinkSync(tempImagePath);

          const metadata = await sharp(rawBuffer).metadata();
          if (!metadata.width || !metadata.height) {
            return reject(new Error("Invalid image metadata."));
          }

          console.log(`Extracted Frame Dimensions: ${metadata.width}x${metadata.height}`);

          let image = sharp(rawBuffer);

          if (cropImage) {
            const baseSize = 512;
            const scaleX = metadata.width / baseSize;
            const scaleY = metadata.height / baseSize;

            const baseExtract = { left: 68, top: 66, width: 390, height: 390 };

            const extractRegion = {
              left: Math.round(baseExtract.left * scaleX),
              top: Math.round(baseExtract.top * scaleY),
              width: Math.round(baseExtract.width * scaleX),
              height: Math.round(baseExtract.height * scaleY),
            };

            if (
              extractRegion.left + extractRegion.width > metadata.width ||
              extractRegion.top + extractRegion.height > metadata.height
            ) {
              console.error("❌ Extract region is out of bounds! Skipping crop.");
            } else {
              console.log(`Cropping to:`, extractRegion);
              image = image.extract(extractRegion);
            }
          }

          // Resize AFTER crop
          image = image.resize(size, size);

          if (roundImage) {
            console.log("Applying rounded mask...");
            let circleMask = await sharp({
              create: {
                width: size,
                height: size,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
              },
            })
              .composite([
                {
                  input: Buffer.from(
                    `<svg width="${size}" height="${size}">
                      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
                    </svg>`
                  ),
                  blend: "over",
                },
              ])
              .png()
              .toBuffer();

            // Ensure the mask matches the final size
            const finalMetadata = await image.metadata();
            const maskMetadata = await sharp(circleMask).metadata();
            console.log(`Final Image: ${finalMetadata.width}x${finalMetadata.height}`);
            console.log(`Mask: ${maskMetadata.width}x${maskMetadata.height}`);

            if (finalMetadata.width !== maskMetadata.width || finalMetadata.height !== maskMetadata.height) {
              console.error("❌ Mask and image dimensions do not match! Resizing mask...");
              circleMask = await sharp(circleMask).resize(finalMetadata.width, finalMetadata.height).toBuffer();
            }

            image = image.composite([{ input: circleMask, blend: "dest-in" }]);
          }

          const processedBuffer = await image.toFormat("png").toBuffer();
          resolve(processedBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => {
        fs.unlinkSync(tempVideoPath);
        if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
        reject(err);
      })
      .screenshots({
        count: 1,
        folder: path.dirname(tempImagePath),
        filename: `${name}.png`,
        size: `${size}x${size}`,
      });
  });
}
