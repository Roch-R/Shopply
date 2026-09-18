import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import Tesseract from "tesseract.js";

export const runtime = "nodejs";

const runPythonVision = (imageBuffer: Buffer): Promise<any> => {
  return new Promise((resolve) => {
    try {
      const tempPath = path.join(os.tmpdir(), `shopply_vision_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
      fs.writeFileSync(tempPath, imageBuffer);

      const scriptPath = path.join(process.cwd(), "ai_vision_scanner.py");
      if (!fs.existsSync(scriptPath)) {
        fs.unlink(tempPath, () => {});
        return resolve(null);
      }

      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      execFile(pythonCmd, [scriptPath, tempPath], { timeout: 3500 }, (error, stdout) => {
        fs.unlink(tempPath, () => {});
        if (error || !stdout) {
          return resolve(null);
        }
        try {
          const parsed = JSON.parse(stdout.trim());
          resolve(parsed);
        } catch {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
};

export async function POST(req: NextRequest) {
  try {
    let base64Data = "";
    let filename = "";
    let colorName = "";
    let currentCategory = "General";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      base64Data = body.image || "";
      filename = body.filename || "";
      colorName = body.color || "";
      currentCategory = body.category || "General";
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      filename = formData.get("filename")?.toString() || (file ? file.name : "");
      colorName = formData.get("color")?.toString() || "";
      currentCategory = formData.get("category")?.toString() || "General";

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        base64Data = `data:${file.type};base64,${Buffer.from(arrayBuffer).toString("base64")}`;
      } else {
        base64Data = formData.get("image")?.toString() || "";
      }
    }

    if (!base64Data && !filename) {
      return NextResponse.json({ success: false, error: "No image or filename provided" }, { status: 400 });
    }

    let imageBuffer: Buffer | null = null;
    if (base64Data && base64Data.includes("base64,")) {
      const cleanBase64 = base64Data.split("base64,")[1];
      imageBuffer = Buffer.from(cleanBase64, "base64");
    }

    // Run Python vision and Tesseract OCR in parallel
    let extractedText = "";
    let pythonAnalysis: any = null;

    if (imageBuffer) {
      const [ocrResult, pyResult] = await Promise.all([
        (async () => {
          try {
            const timeoutPromise = new Promise<{ data: { text: string } }>((resolve) =>
              setTimeout(() => resolve({ data: { text: "" } }), 6000)
            );
            const ocrPromise = Tesseract.recognize(imageBuffer, "eng");
            const res = await Promise.race([ocrPromise, timeoutPromise]);
            return res?.data?.text || "";
          } catch (e) {
            console.warn("OCR Error:", e);
            return "";
          }
        })(),
        runPythonVision(imageBuffer)
      ]);

      extractedText = ocrResult;
      pythonAnalysis = pyResult;
    }

    // Clean extracted OCR text
    const cleanOcr = extractedText.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
    const fullText = `${filename} ${cleanOcr} ${colorName}`.toLowerCase();

    const colorPrefix = colorName ? `${colorName} ` : (pythonAnalysis?.dominant_color_name && pythonAnalysis.dominant_color_name !== "Neutral" ? `${pythonAnalysis.dominant_color_name} ` : "");

    let title = "";
    let category = currentCategory || "General";
    let categoryLabel = "Gadgets";
    let suggestedPrice = "499.00";
    let detectedType = "product";

    // 1. PAPER & OFFICE SUPPLIES (e.g. Hard Copy Bond Paper)
    if (/\b(hard\s*copy|copy\s*paper|bond\s*paper|substance\s*20|substance\s*24|70\s*gsm|80\s*gsm|paperone|paper\s*tree|ream|bondpaper)\b/i.test(fullText)) {
      title = "Advance Hard Copy Multi-Purpose Bond Paper (Substance 20 / 70 GSM)";
      category = "Home";
      categoryLabel = "Living";
      suggestedPrice = "180.00";
      detectedType = "Bond Paper / Office Supplies";
    }
    // 2. HEADPHONES & AUDIO
    else if (/\b(headphone|headphones|headset|earphone|earphones|airpod|airpods|earbuds|sony\s*wh|bose|audio)\b/i.test(fullText)) {
      title = `${colorPrefix}Wireless Over-Ear Noise-Cancelling Headphones`.trim();
      category = "General";
      categoryLabel = "Gadgets";
      suggestedPrice = "1899.00";
      detectedType = "Audio & Headphones";
    }
    // 3. SHOES & FOOTWEAR
    else if (/\b(shoe|shoes|sneaker|sneakers|nike|adidas|jordan|dunk|yeezy|air\s*force|air\s*max|crocs|slides|boots|heels)\b/i.test(fullText)) {
      title = `${colorPrefix}Lightweight Cushion Running Sneakers`.trim();
      category = "Shoes";
      categoryLabel = "Footwear";
      suggestedPrice = "2499.00";
      detectedType = "Footwear & Shoes";
    }
    // 4. TECH & LAPTOPS
    else if (/\b(macbook|laptop|thinkpad|asus|acer|lenovo|dell|hp\s*laptop|intel|ryzen|gaming\s*pc|monitor)\b/i.test(fullText)) {
      title = "Ultra-Slim High-Performance Laptop";
      category = "Electronics";
      categoryLabel = "Tech";
      suggestedPrice = "29990.00";
      detectedType = "Laptops & Tech";
    }
    // 5. SMARTPHONES
    else if (/\b(iphone|samsung\s*galaxy|redmi|xiaomi|pixel|smartphone|android|5g\s*phone)\b/i.test(fullText)) {
      title = "Flagship 5G Ultra-HD Smartphone";
      category = "Electronics";
      categoryLabel = "Tech";
      suggestedPrice = "18990.00";
      detectedType = "Smartphones";
    }
    // 6. APPAREL & CLOTHING
    else if (/\b(shirt|t-shirt|tee|hoodie|jacket|polo|jersey|pants|jeans|denim|sweater|cardigan)\b/i.test(fullText)) {
      title = `${colorPrefix}Vintage Oversized Streetwear Cotton T-Shirt`.trim();
      category = "Clothes";
      categoryLabel = "Apparel";
      suggestedPrice = "499.00";
      detectedType = "Apparel & Clothes";
    }
    // 7. WATCHES & JEWELRY
    else if (/\b(watch|casio|g-shock|seiko|rolex|chronograph|water\s*resist|smartwatch|necklace|bracelet|ring)\b/i.test(fullText)) {
      title = `${colorPrefix}Luxury Waterproof Chronograph Sports Watch`.trim();
      category = "Accessories";
      categoryLabel = "Jewelry";
      suggestedPrice = "1499.00";
      detectedType = "Watches & Jewelry";
    }
    // 8. BEAUTY & COSMETICS
    else if (/\b(lipstick|serum|sunscreen|lotion|cream|perfume|cologne|maybelline|skincare)\b/i.test(fullText)) {
      title = `${colorPrefix}Velvet Long-Lasting Hydrating Beauty Essential`.trim();
      category = "Beauty";
      categoryLabel = "Beauty";
      suggestedPrice = "380.00";
      detectedType = "Beauty & Cosmetics";
    }
    // 9. TUMBLER & HOME LIVING
    else if (/\b(aquaflask|hydro\s*flask|stanley|thermos|tumbler|bottle|lamp|chair|sofa|kitchen)\b/i.test(fullText)) {
      title = "Vacuum Insulated Stainless Steel Thermal Tumbler";
      category = "Home";
      categoryLabel = "Living";
      suggestedPrice = "599.00";
      detectedType = "Living & Home";
    }
    // 10. Fallback: Clean prominent words from OCR if at least 2 words exist
    else if (cleanOcr.length > 5) {
      const words = cleanOcr.split(" ").filter((w: string) => w.length > 2 && !/^(the|and|for|with|this|from|item)$/i.test(w)).slice(0, 4);
      if (words.length >= 2) {
        title = words.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        title = `${colorPrefix}${title}`.trim();
        detectedType = "Scanned Text Match";
      }
    }

    if (!title) {
      title = `${colorPrefix}Premium Lifestyle Product`.trim();
    }

    const catLabels: Record<string, string> = {
      General: "Gadgets",
      Electronics: "Tech",
      Clothes: "Apparel",
      Shoes: "Footwear",
      Beauty: "Beauty",
      Home: "Living",
      Accessories: "Jewelry"
    };
    categoryLabel = catLabels[category] || "Gadgets";

    const cleanTitleUpper = title.toUpperCase();
    const description = `✨ ${cleanTitleUpper} — 100% ORIGINAL RELEASE\n\nUpgrade your everyday lifestyle with the premium ${title}. Inspected for unmatched reliability, contemporary aesthetic styling, and exceptional durability you can depend on.\n\n🌟 KEY FEATURES & HIGHLIGHTS:\n• High-Durability Construction: Verified authentic materials built to last\n• Ergonomic & Practical Design: Engineered for seamless daily utility\n• Verified Shopply Quality: Guaranteed authentic and inspected prior to dispatch\n• Hassle-Free Buyer Guarantee: Fast replacement and secure payment protection\n\n🚚 FAST NATIONWIDE EXPRESS DELIVERY:\nPacked with heavy-duty shock-absorbent multi-layer bubble wrap. Same-day or next-day shipping guaranteed!`;

    const summary = `📌 QUICK SUMMARY FOR ${cleanTitleUpper}:\n• Quality: 100% Authentic & Inspected for Superior Performance\n• Best For: Daily Wear / Daily Use & Lifestyle Essentials\n• Highlights: High-Durability Materials with Sleek Contemporary Styling\n• Guarantee: Verified Shopply Seller Guarantee with Fast Nationwide Express Delivery`;

    return NextResponse.json({
      success: true,
      title,
      category,
      categoryLabel,
      suggestedPrice,
      detectedType,
      scannedText: cleanOcr.substring(0, 100),
      pythonVision: pythonAnalysis,
      summary,
      description
    });
  } catch (error: any) {
    console.error("API AI Scan Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
