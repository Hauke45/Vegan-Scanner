"use strict";

const barcodeForm = document.querySelector("#barcode-form");
const barcodeInput = document.querySelector("#barcode-input");
const ingredientsForm = document.querySelector("#ingredients-form");
const ingredientsInput = document.querySelector("#ingredients-input");
const startScannerButton = document.querySelector("#start-scanner");
const stopScannerButton = document.querySelector("#stop-scanner");
const scannerStatus = document.querySelector("#scanner-status");
const resultSection = document.querySelector("#result");
const html5QrCodeElement = document.querySelector("#reader");

const ANIMAL_RULES = [
  { pattern: /\be120\b|\bkarmin(?:rot)?\b|\bcochenille\b|\bschildlaus(?:en)?\b/i, name: "Karmin / E120" },
  { pattern: /\be441\b|\bgelatine?\b|\bgela?tin\b/i, name: "Gelatine / E441" },
  { pattern: /\be901\b|\bbienenwachs\b/i, name: "Bienenwachs / E901" },
  { pattern: /\be904\b|\bschellack\b|\bshellac\b/i, name: "Schellack / E904" },
  { pattern: /\be542\b|\bknochenphosphat\b/i, name: "Knochenphosphat / E542" },
  { pattern: /\be1105\b|\blysozym\b/i, name: "Lysozym / E1105 (häufig aus Ei)" },
  { pattern: /\b(?:magermilch|vollmilch|milch(?:schokolade|pulver|protein|zucker|fett|erzeugnis|konzentrat)?|buttermilch|molken|molke|whey|milk(?:powder|protein|fat|chocolate)?|laktose|lactose|casein|kasein|sahne|rahm|butter(?:reinfett)?|kase|kaese)\w*/i, name: "Milchbestandteil" },
  { pattern: /\b(?:eiweiss|eiklar|eigelb|eipulver|eieralbumin|albumin|ovalbumin|huhnerei|huehnerei|huhnereiweiss|huehnereieiweiss)\w*/i, name: "Ei-Bestandteil" },
  { pattern: /\b(?:honig|bienenhonig|gelée royale|gelee royale|propolis|bienenpollen)\b/i, name: "Bienenprodukt" },
  { pattern: /\b(?:lanolin|wolll?wachs|talg|schmalz|gelatine|kollagen|collagen|fleischextrakt|fischgelatine|fischöl|fischol|anchovis|sardelle|fischsauce|kaviar)\w*/i, name: "Tierischer Bestandteil" },
  { pattern: /\b(?:rindfleisch|schweinefleisch|huhnerfleisch|fleischbruhe|tierisches fett|tierfett)\w*/i, name: "Fleisch oder tierisches Fett" }
];

const AMBIGUOUS_RULES = [
  { pattern: /\be(?:470[a-f]?|471|472[a-f]?|473|474|475|477|481|482|491|492|493|494|495)\b/i, name: "Fettsäureester (z. B. E471)" },
  { pattern: /\be322\b|\blecithin\b/i, name: "Lecithin (E322)" },
  { pattern: /\be422\b|\bglycerin(?:e)?\b|\bglycerol\b/i, name: "Glycerin (E422)" },
  { pattern: /\be(?:627|631|635)\b/i, name: "Geschmacksverstärker (E627/E631/E635)" },
  { pattern: /\bvitamin d3\b|\bcholecalciferol\b/i, name: "Vitamin D3" },
  { pattern: /\bstear(?:insäure|insaure)|stearate?\b|\bfettsäure(?:n)?\b|\bfettsaure(?:n)?\b/i, name: "Fettsäure oder Stearat" }
];

const VEGAN_LABELS = new Set(["en:vegan", "de:vegan"]);

let scanner;

// Plant-based milks contain "milch" in German but are not animal milk.
function normalizeIngredientText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/\b(?:soja|hafer|mandel|kokos|reis|erdnuss|cashew|dinkel|hirse|haselnuss|pflanzen|vegan)\s*milch(?:pulver|protein|zucker|fett)?\b/gi, " ")
    .replace(/\b(?:oat|almond|coconut|rice|soy|plant[- ]based)\s*milk(?:powder|protein|fat)?\b/gi, " ")
    .replace(/\b(?:oat|almond|coconut|rice|soy|plant[- ]based)\s+milk\b/gi, " ")
    .toLowerCase();
}

function matchesRule(rule, text) {
  return rule.pattern.test(text);
}

function analyzeIngredients(ingredients, additiveTags = [], hasVeganLabel = false) {
  const allText = normalizeIngredientText(`${ingredients} ${additiveTags.join(" ")}`);
  const animalMatches = ANIMAL_RULES.filter((rule) => matchesRule(rule, allText));

  if (animalMatches.length) {
    const names = [...new Set(animalMatches.map((match) => match.name))];
    return {
      verdict: "NICHT VEGAN",
      reason: `Erkannt: ${names.join(", ")}. Diese Regel deutet auf einen tierischen Bestandteil hin.`
    };
  }

  const ambiguousMatches = AMBIGUOUS_RULES.filter((rule) => matchesRule(rule, allText));

  if (ambiguousMatches.length) {
    const names = [...new Set(ambiguousMatches.map((match) => match.name))];
    return {
      verdict: "UNKLAR",
      reason: `Möglicherweise enthalten: ${names.join(", ")}. Die Herkunft kann je nach Produkt variieren.`
    };
  }

  if (!ingredients.trim()) {
    return {
      verdict: "UNKLAR",
      reason: "Es liegen keine Zutatenangaben vor. Ohne Zutatenliste wird niemals automatisch „VEGAN“ angezeigt."
    };
  }

  const labelNote = hasVeganLabel
    ? " Open Food Facts führt außerdem ein Vegan-Label für dieses Produkt."
    : "";

  return {
    verdict: "VEGAN",
    reason: `In den angegebenen Zutaten wurden keine in dieser einfachen Regelliste bekannten tierischen oder mehrdeutigen Stoffe erkannt.${labelNote} Das ist nur eine automatische Einschätzung, keine Garantie.`
  };
}

function showResult({ name, ingredients, additives, source, barcode, veganLabel = false }) {
  const analysis = analyzeIngredients(ingredients, additives, veganLabel);
  const verdictElement = document.querySelector("#verdict");
  const ingredientText = ingredients.trim() || "Keine Zutatenangaben vorhanden.";
  const additiveText = additives.length
    ? additives.join(", ")
    : "Keine Zusatzstoffangaben vorhanden.";

  document.querySelector("#result-source").textContent = source;
  document.querySelector("#product-name").textContent = name || "Produktname nicht angegeben";
  document.querySelector("#reason").textContent = analysis.reason;
  document.querySelector("#ingredients-display").textContent = ingredientText;
  document.querySelector("#additives-display").textContent = additiveText;
  verdictElement.textContent = analysis.verdict;
  verdictElement.className = `verdict ${getVerdictClass(analysis.verdict)}`;

  const productLink = document.querySelector("#product-link");
  if (barcode) {
    productLink.href = `https://world.openfoodfacts.org/product/${encodeURIComponent(barcode)}`;
    productLink.hidden = false;
  } else {
    productLink.hidden = true;
    productLink.removeAttribute("href");
  }

  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getVerdictClass(verdict) {
  if (verdict === "VEGAN") return "verdict-vegan";
  if (verdict === "NICHT VEGAN") return "verdict-not-vegan";
  return "verdict-unclear";
}

function normalizeAdditiveTag(tag) {
  const match = tag.match(/(?:^|:)e(\d+[a-z]?)(?:$|:)/i);
  return match ? `E${match[1].toUpperCase()}` : tag;
}

async function searchProduct(barcode) {
  if (!/^\d{8,14}$/.test(barcode)) {
    throw new Error("Bitte gib einen Barcode mit 8 bis 14 Ziffern ein.");
  }

  const fields = [
    "product_name",
    "product_name_de",
    "ingredients_text",
    "ingredients_text_de",
    "additives_tags",
    "labels_tags"
  ].join(",");
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Die Produktsuche ist fehlgeschlagen (HTTP ${response.status}).`);
  }

  const data = await response.json();
  if (data.status !== 1 || !data.product) {
    throw new Error("Zu diesem Barcode wurde kein Produkt in Open Food Facts gefunden.");
  }

  const product = data.product;
  const ingredients = product.ingredients_text_de || product.ingredients_text || "";
  const additives = Array.isArray(product.additives_tags)
    ? product.additives_tags.map(normalizeAdditiveTag)
    : [];
  const labels = Array.isArray(product.labels_tags) ? product.labels_tags : [];

  showResult({
    name: product.product_name_de || product.product_name || "",
    ingredients,
    additives,
    source: "Daten aus Open Food Facts",
    barcode,
    veganLabel: labels.some((label) => VEGAN_LABELS.has(label.toLowerCase()))
  });
}

function setScannerStatus(message, isError = false) {
  scannerStatus.textContent = message;
  scannerStatus.classList.toggle("error", isError);
}

async function stopScanner() {
  const errors = [];

  if (scanner?.isScanning) {
    try {
      await scanner.stop();
    } catch (error) {
      errors.push(`Der Scanner konnte nicht sauber beendet werden: ${error.message}`);
    }
  }

  // Release any remaining camera tracks even if the scanner library could not stop cleanly.
  html5QrCodeElement.querySelectorAll("video").forEach((video) => {
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    video.pause();
    video.srcObject = null;
  });

  if (scanner) {
    try {
      await scanner.clear();
    } catch (error) {
      errors.push(`Der Scannerbereich konnte nicht geleert werden: ${error.message}`);
    }
  }

  scanner = undefined;
  html5QrCodeElement.classList.remove("is-active");
  stopScannerButton.hidden = true;

  if (errors.length) {
    setScannerStatus(errors.join(" "), true);
    return false;
  }

  return true;
}

async function handleBarcode(barcode) {
  setScannerStatus("Produkt wird gesucht …");
  try {
    await searchProduct(barcode);
    setScannerStatus("");
  } catch (error) {
    setScannerStatus(error.message, true);
  }
}

barcodeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!barcodeForm.reportValidity()) return;

  const submitButton = barcodeForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  try {
    await handleBarcode(barcodeInput.value.trim());
  } finally {
    submitButton.disabled = false;
  }
});

ingredientsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!ingredientsForm.reportValidity()) return;

  showResult({
    name: "Manuelle Zutatenprüfung",
    ingredients: ingredientsInput.value.trim(),
    additives: [],
    source: "Deine Eingabe"
  });
});

startScannerButton.addEventListener("click", async () => {
  if (!window.isSecureContext) {
    setScannerStatus("Der Kamerazugriff funktioniert nur über HTTPS oder auf localhost.", true);
    return;
  }

  if (typeof window.Html5Qrcode === "undefined") {
    setScannerStatus("Die Scanner-Bibliothek konnte nicht geladen werden. Prüfe deine Internetverbindung.", true);
    return;
  }

  startScannerButton.disabled = true;
  html5QrCodeElement.classList.add("is-active");
  setScannerStatus("Kamera wird gestartet …");
  try {
    scanner = new window.Html5Qrcode("reader");
    await scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      async (decodedText) => {
        if (!/^\d{8,14}$/.test(decodedText)) {
          setScannerStatus("Erkannt, aber kein unterstützter Barcode. Bitte EAN-Code scannen.", true);
          return;
        }

        await stopScanner();
        await handleBarcode(decodedText);
      },
      () => {}
    );
    stopScannerButton.hidden = false;
    setScannerStatus("Barcode vor die Kamera halten.");
  } catch (error) {
    const cleanupSucceeded = await stopScanner();
    const cleanupMessage = cleanupSucceeded ? "" : ` ${scannerStatus.textContent}`;
    setScannerStatus(`Kamera konnte nicht gestartet werden: ${error.message}.${cleanupMessage}`, true);
  } finally {
    startScannerButton.disabled = false;
  }
});

stopScannerButton.addEventListener("click", async () => {
  const stopped = await stopScanner();
  if (stopped) setScannerStatus("Scanner gestoppt.");
});
