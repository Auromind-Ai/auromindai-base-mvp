const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const PUBLIC_IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');
const MAX_WIDTH = 1200;
const WEBP_QUALITY = 82;
const SUPPORTED_EXTS = ['.png', '.jpg', '.jpeg'];

const stats = {
  totalFiles: 0,
  converted: [],
  skipped: [],
  failed: []
};

// Helper function to format bytes nicely
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Recursively find all files in a directory
function getFilesRecursively(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function convertImages() {
  console.log('Starting image optimization pipeline...');
  console.log(`Scanning directory: ${PUBLIC_IMAGES_DIR}\n`);

  if (!fs.existsSync(PUBLIC_IMAGES_DIR)) {
    console.error(`Error: Directory not found: ${PUBLIC_IMAGES_DIR}`);
    process.exit(1);
  }

  const allFiles = getFilesRecursively(PUBLIC_IMAGES_DIR);
  const imageFiles = allFiles.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_EXTS.includes(ext);
  });

  stats.totalFiles = imageFiles.length;
  console.log(`Found ${stats.totalFiles} supported images to check.\n`);

  for (const sourcePath of imageFiles) {
    const ext = path.extname(sourcePath);
    const relativePath = path.relative(PUBLIC_IMAGES_DIR, sourcePath);
    
    // Generate WebP destination path keeping the folder hierarchy
    const destPath = sourcePath.substring(0, sourcePath.length - ext.length) + '.webp';
    const relativeDestPath = path.relative(PUBLIC_IMAGES_DIR, destPath);

    try {
      const sourceStat = fs.statSync(sourcePath);
      const sourceSize = sourceStat.size;

      // Check if WebP already exists and is up to date
      if (fs.existsSync(destPath)) {
        const destStat = fs.statSync(destPath);
        if (destStat.mtimeMs >= sourceStat.mtimeMs) {
          stats.skipped.push({
            path: relativePath,
            size: sourceSize
          });
          continue;
        }
      }

      // Read image metadata
      const image = sharp(sourcePath);
      const metadata = await image.metadata();

      let pipeline = sharp(sourcePath);

      // Resize only if width exceeds max limit (preserve aspect ratio, do not enlarge)
      if (metadata.width && metadata.width > MAX_WIDTH) {
        pipeline = pipeline.resize({
          width: MAX_WIDTH,
          withoutEnlargement: true
        });
      }

      // Process and convert to webp (transparency is preserved automatically by sharp)
      const buffer = await pipeline
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      // Write output webp file
      fs.writeFileSync(destPath, buffer);
      
      const destSize = buffer.length;
      stats.converted.push({
        path: relativePath,
        originalSize: sourceSize,
        optimizedSize: destSize,
        savedSize: sourceSize - destSize,
        percentageSaved: ((sourceSize - destSize) / sourceSize) * 100
      });

      console.log(`✓ Converted: ${relativePath} (${formatBytes(sourceSize)} -> ${formatBytes(destSize)}, -${((sourceSize - destSize) / sourceSize * 100).toFixed(1)}%)`);

    } catch (error) {
      stats.failed.push({
        path: relativePath,
        error: error.message
      });
      console.error(`✗ Failed: ${relativePath} - Error: ${error.message}`);
    }
  }

  printReport();
}

function printReport() {
  console.log('\n==================================================');
  console.log('            IMAGE OPTIMIZATION REPORT');
  console.log('==================================================');
  console.log(`Total Files Checked:  ${stats.totalFiles}`);
  console.log(`Converted:            ${stats.converted.length}`);
  console.log(`Skipped (Up-to-date): ${stats.skipped.length}`);
  console.log(`Failed:               ${stats.failed.length}`);
  console.log('--------------------------------------------------');

  if (stats.converted.length > 0) {
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;

    console.log('\nConverted Files Detail:');
    stats.converted.forEach(file => {
      totalOriginalSize += file.originalSize;
      totalOptimizedSize += file.optimizedSize;
      console.log(` - ${file.path}: ${formatBytes(file.originalSize)} -> ${formatBytes(file.optimizedSize)} (-${file.percentageSaved.toFixed(1)}%)`);
    });

    const totalSaved = totalOriginalSize - totalOptimizedSize;
    const totalPercentSaved = (totalSaved / totalOriginalSize) * 100;

    console.log('\nSpace Savings Summary (Converted Files Only):');
    console.log(`Original Size:   ${formatBytes(totalOriginalSize)}`);
    console.log(`Optimized Size:  ${formatBytes(totalOptimizedSize)}`);
    console.log(`Space Saved:     ${formatBytes(totalSaved)} (${totalPercentSaved.toFixed(1)}% reduction)`);
  } else {
    console.log('\nNo files were converted (all up-to-date or failed).');
  }

  if (stats.failed.length > 0) {
    console.log('\nFailed Conversions:');
    stats.failed.forEach(file => {
      console.log(` - ${file.path}: ${file.error}`);
    });
  }

  console.log('==================================================\n');
}

convertImages();
