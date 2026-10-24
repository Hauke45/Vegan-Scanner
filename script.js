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

let scanner;

function showResult({ name, ingredients, additives, source, barcode, analysis }) {
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

async function searchProduct(barcode) {
  if (!/^\d{8,14}$/.test(barcode)) {
    throw new Error("Bitte gib einen Barcode mit 8 bis 14 Ziffern ein.");
  }

  const fields = [
    "product_name",
    "product_name_de",
    "ingredients_text",
    "ingredients_text_de",
    "ingredients_text_en",
    "ingredients",
    "ingredients_tags",
    "additives_tags",
    "labels_tags",
    "ingredients_analysis_tags"
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
  const result = window.VeganCheck.toDisplayData(product);

  showResult({
    ...result,
    source: "Daten aus Open Food Facts",
    barcode
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
    source: "Deine Eingabe",
    analysis: window.VeganCheck.analyzeProduct({
      ingredients_text_de: ingredientsInput.value.trim()
    })
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
