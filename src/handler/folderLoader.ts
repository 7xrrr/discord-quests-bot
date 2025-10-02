import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { Logger } from "../core/logger.js";

interface LoadFolderOptions {
    subFolders?: boolean;
    logger?: boolean;
    shouldReturn?: boolean;
    formats?: string[];
}

export async function loadFolder(
    folderPath: string,
    options: LoadFolderOptions = {}
): Promise<void | any[]> {
    const {
        subFolders = false,
        logger = false,
        shouldReturn = false,
        formats = [".ts", ".js"],
    } = options;

    if (!fs.existsSync(folderPath)) {
        if (logger) Logger.warn(`Folder not found: ${folderPath}`);
        return shouldReturn ? [] : undefined;
    }

    const fileStats = fs.statSync(folderPath);
    if (!fileStats.isDirectory()) {
        if (logger) Logger.warn(`Path is not a directory: ${folderPath}`);
        return shouldReturn ? [] : undefined;
    }

    const files = fs.readdirSync(folderPath);
    const results: any[] = [];

    for (const file of files) {

        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory() && subFolders) {

            const subResults = await loadFolder(filePath, options);

            if (shouldReturn && Array.isArray(subResults)) {
                results.push(...subResults);
            }
            continue;
        }

        const ext = path.extname(file);

        if (formats.includes(ext)) {
            try {

                if (logger) Logger.info(`Importing file: ${filePath}`);
                const fileUrl = pathToFileURL(filePath).href;


                const imported = await import(fileUrl);
                if (shouldReturn) {
                    results.push(imported.default ?? imported);
                }
            } catch (error) {

                Logger.error(`❌ Failed to import file: ${filePath}`);
                Logger.error(error instanceof Error ? error.stack : error); // ✅ stack trace shown
               // throw new Error(`Error importing file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);



            }
        } else {
            if (logger) Logger.info(`Non-import file, pushing path: ${filePath}`);
            if (shouldReturn) {

                results.push(filePath);
            }
        }
    }

    return shouldReturn ? results : undefined;
}
