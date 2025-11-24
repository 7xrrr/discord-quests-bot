
import fs from "fs";

import path from "path";
import { findProjectRoot } from "./tools.js";

import axios from 'axios';
import sharp from "sharp";

import ffmpeg from "fluent-ffmpeg";
import { CustomClient } from "../core/customClient.js";
import { Logger } from "../core/logger.js";

const extractFirstFrameCached: Map<string, Promise<Buffer>> = new Map();

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
      Logger.info(`Emoji ${emoji.name} created`);
    }).catch((err) => {
      Logger.info(`Error creating emoji ${emoji}: ${err.message}`);
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
    let response = await axios.get(emojiUrl, { responseType: "arraybuffer" });

    const isMp4 =
      emojiUrl.endsWith(".mp4") ||
      response.headers["content-type"]?.includes("video/mp4");

    let buffer: Buffer;

    if (isMp4) {
      // If it's a video, extract the first frame with optional cropping and rounding
      buffer = await extractFirstFrame(response.data, 128,emojiName, roundImage, cropImage);
    } else {
      const size = 128; // Final size of the emoji

      let image = sharp(response?.data).resize(size, size);
      
      if (cropImage) {
        const metadata = await sharp(response?.data).metadata();
        if (!metadata.width || !metadata.height) {
          throw new Error("Invalid image metadata.");
        }
        response = null;

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



function cleanupTempFiles(...files: string[]) {
  for (const file of files) {
    if (file && fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
}
export  async function _extractFirstFrame(
  videoBuffer: Buffer,
  size: number = 128,
  name: string,
  roundImage: boolean = false,
  cropImage: boolean = false
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const projectRoot = findProjectRoot();
    const tempDir = path.join(projectRoot, "images");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  
    const tempVideoPath = path.join(tempDir, `${name}.mp4`);
    const tempImagePath = path.join(tempDir, `${name}.png`);

    fs.writeFileSync(tempVideoPath, videoBuffer);

    ffmpeg(tempVideoPath)
      .on("end", async () => {
        try {
          if (!fs.existsSync(tempImagePath)) {
            cleanupTempFiles(tempVideoPath, tempImagePath);
            return reject(new Error("❌ Failed to extract frame: Image file was not created."));
          }

          let image = sharp(fs.readFileSync(tempImagePath));
          const metadata = await image.metadata();

          if (!metadata.width || !metadata.height) {
            cleanupTempFiles(tempVideoPath, tempImagePath);
            return reject(new Error("❌ Invalid image metadata."));
          }

          // 🖼️ Cropping
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
              extractRegion.left + extractRegion.width <= metadata.width &&
              extractRegion.top + extractRegion.height <= metadata.height
            ) {
              image = image.extract(extractRegion);
            }
          }

          // 📏 Resize
          image = image.resize(size, size);

          // 🔵 Rounded mask
          if (roundImage) {
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

            circleMask = await sharp(circleMask).resize(size, size).toBuffer();
            image = image.composite([{ input: circleMask, blend: "dest-in" }]);
          }

          const processedBuffer = await image.png().toBuffer();
          image = null;
        
          cleanupTempFiles(tempVideoPath, tempImagePath);
          resolve(processedBuffer);
        } catch (err) {
          cleanupTempFiles(tempVideoPath, tempImagePath);
          reject(err);
        }
      })
      .on("error", (err) => {
        cleanupTempFiles(tempVideoPath, tempImagePath);
        reject(err);
      })
      .screenshots({
        count: 1,
        folder: tempDir,
        filename: path.basename(tempImagePath),
        size: `${size}x${size}`,
      });
  });

}



export async function extractFirstFrame(
  videoBuffer: Buffer,
  size: number = 128,
  name: string,
  roundImage: boolean = false,
  cropImage: boolean = false
): Promise<Buffer> {
  if(extractFirstFrameCached.has(name)) {
    return extractFirstFrameCached.get(name)!;
  }
  const extractionPromise = _extractFirstFrame(videoBuffer, size, name, roundImage, cropImage);
  extractFirstFrameCached.set(name, extractionPromise);
  const result = await extractionPromise;
  extractFirstFrameCached.delete(name);
  return result;
}