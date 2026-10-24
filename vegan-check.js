"use strict";

(function exposeVeganCheck(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.VeganCheck = api;
})(globalThis, () => {
  const ANIMAL_RULES = [
    { pattern: /\be(?:\s|-)?120\b|\bkarmin(?:rot)?\b|\bcochenille\b|\bschildlaus(?:en)?\b/gi },
    { pattern: /\be(?:\s|-)?441\b|\bgelatine?\b|\bgela?tin\b/gi },
    { pattern: /\be(?:\s|-)?901\b|\bbienenwachs\b/gi },
    { pattern: /\be(?:\s|-)?904\b|\bschellack\b|\bshellac\b/gi },
    { pattern: /\be(?:\s|-)?542\b|\bknochenphosphat\b/gi },
    { pattern: /\be(?:\s|-)?1105\b|\blysozym\b/gi },
    { pattern: /\b(?:ei|eier|vollei(?:pulver)?|eigelb|eiklar|eipulver|eiprotein|eieralbumin|eierprotein|eiernudeln|eiersalat|eierteigwaren|ovalbumin|huhnerei|huehnerei|egg|eggs|whole egg|egg yolk|egg white|egg powder|egg protein|albumen)\b/gi },
    { pattern: /\b(?:kuh|ziegen|schaf|voll|mager|butter)?milch(?:pulver|protein|zucker|fett|erzeugnis|konzentrat|schokolade)?\b|\b(?:milk|cow milk|goat milk|sheep milk|milk powder|skimmed milk powder|milk protein|milk fat|whey|whey powder|whey protein|buttermilk|lactose|laktose|casein|caseinate|kasein|kaseinat|(?:calcium|natrium|kalium)caseinat|(?:calcium|natrium|kalium)kaseinat|molke|molkenpulver|molkenprotein)\b/gi },
    { pattern: /\b(?:sahne|rahm|butter|butterreinfett|kaese|kase|cheese|cream)\b/gi },
    { pattern: /\b(?:honig|bienenhonig|gelee royale|propolis|bienenpollen|honey|royal jelly)\b/gi },
    { pattern: /\b(?:schweinefleisch|rindfleisch|huhnerfleisch|huehnerfleisch|lammfleisch|fleischbruhe|fleischbruehe|fleischextrakt|schinken|speck|schmalz|tierisches fett|tierfett|pork|beef|chicken|lamb|ham|bacon|lard|meat broth|meat extract)\b/gi },
    { pattern: /\b(?:fisch|fischol|fischsauce|fischgelatine|anchovis|sardelle|kaviar|fish|fish oil|fish sauce|anchovy|caviar|shrimp|prawn|crab|lobster)\b/gi }
  ];

  const AMBIGUOUS_RULES = [
    { pattern: /\be(?:\s|-)?(?:470[a-f]?|471|472[a-f]?|473|474|475|477|481|482|491|492|493|494|495)\b|\bfettsaure ester\b|\bfatty acid esters?\b/gi, name: "E470–E495 (Fettsäureester)" },
    { pattern: /\be(?:\s|-)?322\b|\blecithin\b/gi, name: "E322 / Lecithin" },
    { pattern: /\be(?:\s|-)?422\b|\bglycerin(?:e)?\b|\bglycerol\b/gi, name: "E422 / Glycerin" },
    { pattern: /\be(?:\s|-)?(?:627|631|635)\b/gi, name: "E627, E631 oder E635" },
    { pattern: /\bvitamin d3\b|\bcholecalciferol\b/gi, name: "Vitamin D3" },
    { pattern: /\bstearinsaure\b|\bstearate?\b|\bfettsauren?\b|\bfatty acids?\b/gi, name: "Fettsäure oder Stearat" },
    { pattern: /\beiweiss\b|\bprotein\b/gi, name: "Eiweiß/Protein ohne eindeutige Herkunft" }
  ];

  const TAG_TERMS = new Map([
    ["egg", "Ei"], ["eggs", "Eier"], ["whole egg", "Vollei"],
    ["egg yolk", "Eigelb"], ["egg white", "Eiklar"], ["egg powder", "Eipulver"],
    ["egg protein", "Eiprotein"], ["egg albumin", "Eialbumin"],
    ["ei", "Ei"], ["eier", "Eier"], ["vollei", "Vollei"], ["eigelb", "Eigelb"],
    ["eiklar", "Eiklar"], ["eipulver", "Eipulver"], ["eiprotein", "Eiprotein"],
    ["milk", "Milch"], ["cow milk", "Kuhmilch"], ["milk powder", "Milchpulver"],
    ["skimmed milk powder", "Magermilchpulver"], ["whey", "Molke"],
    ["whey powder", "Molkenpulver"], ["casein", "Kasein"], ["caseinate", "Kaseinat"],
    ["lactose", "Laktose"], ["laktose", "Laktose"], ["butter", "Butter"],
    ["cream", "Sahne"], ["cheese", "Käse"], ["milch", "Milch"],
    ["milchpulver", "Milchpulver"], ["magermilchpulver", "Magermilchpulver"],
    ["molke", "Molke"], ["molkenpulver", "Molkenpulver"], ["kasein", "Kasein"],
    ["kaseinat", "Kaseinat"], ["sahne", "Sahne"], ["butter", "Butter"],
    ["kaese", "Käse"], ["kase", "Käse"],
    ["pork", "Schweinefleisch"], ["pork meat", "Schweinefleisch"],
    ["beef", "Rindfleisch"], ["chicken", "Hühnerfleisch"], ["fish", "Fisch"],
    ["honey", "Honig"], ["honig", "Honig"], ["gelatin", "Gelatine"],
    ["gelatine", "Gelatine"], ["carmine", "Karmin"], ["cochineal", "Cochenille"],
    ["beeswax", "Bienenwachs"], ["bienenwachs", "Bienenwachs"]
  ]);

  const VEGAN_TAGS = new Set(["vegan", "en:vegan", "de:vegan", "fr:vegan", "it:vegan", "es:vegano"]);
  const NON_VEGAN_TAGS = new Set(["en:non-vegan", "de:nicht-vegan", "non-vegan", "nicht-vegan"]);
  const MAYBE_VEGAN_TAGS = new Set(["en:maybe-vegan", "de:vielleicht-vegan", "maybe-vegan"]);

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ß/g, "ss")
      .toLowerCase();
  }

  function normalizeIngredientTag(tag) {
    const term = normalizeText(tag)
      .replace(/^[a-z]{2,3}:/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return TAG_TERMS.get(term) || term;
  }

  function collectIngredients(product) {
    const text = product.ingredients_text_de
      || product.ingredients_text
      || product.ingredients_text_en
      || "";
    const tags = Array.isArray(product.ingredients_tags)
      ? product.ingredients_tags.map(normalizeIngredientTag)
      : [];
    const structured = Array.isArray(product.ingredients)
      ? product.ingredients.flatMap((ingredient) => {
        if (typeof ingredient === "string") return [ingredient];
        if (!ingredient || typeof ingredient !== "object") return [];
        return [ingredient.text, ingredient.id].filter(Boolean);
      })
      : [];

    return {
      text: String(text),
      tags: [...new Set([...tags, ...structured])],
      hasIngredientData: Boolean(String(text).trim() || tags.length || structured.length)
    };
  }

  function getVeganEvidence(product) {
    const labels = Array.isArray(product.labels_tags) ? product.labels_tags : [];
    const analysis = Array.isArray(product.ingredients_analysis_tags)
      ? product.ingredients_analysis_tags
      : [];
    const normalizedLabels = labels.map((tag) => String(tag).toLowerCase());
    const normalizedAnalysis = analysis.map((tag) => String(tag).toLowerCase());
    const hasVeganLabel = normalizedLabels.some((tag) => VEGAN_TAGS.has(tag));
    const saysVegan = hasVeganLabel || normalizedAnalysis.some((tag) => VEGAN_TAGS.has(tag));
    const saysNonVegan = normalizedLabels.some((tag) => NON_VEGAN_TAGS.has(tag))
      || normalizedAnalysis.some((tag) => NON_VEGAN_TAGS.has(tag));
    const saysMaybeVegan = normalizedAnalysis.some((tag) => MAYBE_VEGAN_TAGS.has(tag));

    return { hasVeganLabel, saysVegan, saysNonVegan, saysMaybeVegan };
  }

  function findMatches(rules, text) {
    const matches = [];
    for (const rule of rules) {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      for (const match of text.matchAll(pattern)) {
        matches.push({ value: match[0], name: rule.name });
      }
    }
    return matches;
  }

  function analyzeProduct(product = {}) {
    const { text, tags, hasIngredientData } = collectIngredients(product);
    const evidence = getVeganEvidence(product);
    const additiveTags = Array.isArray(product.additives_tags)
      ? product.additives_tags.map(normalizeIngredientTag)
      : [];
    const ingredientText = normalizeText(`${text} ${tags.join(" ")} ${additiveTags.join(" ")}`);

    // Plant-based milk names must not be mistaken for dairy milk.
    const searchableText = ingredientText.replace(
      /\b(?:soja|hafer|mandel|kokos|reis|erdnuss|cashew|dinkel|hirse|haselnuss|pflanzen|vegan)\s*milch(?:pulver|protein|zucker|fett)?\b|\b(?:oat|almond|coconut|rice|soy|plant based)\s*milk(?: powder| protein| fat)?\b/g,
      " "
    );
    const animalMatches = findMatches(ANIMAL_RULES, searchableText);
    const uniqueAnimalIngredients = [...new Set(animalMatches.map((match) => match.value))];

    if (uniqueAnimalIngredients.length) {
      const conflict = evidence.saysVegan
        ? " Open Food Facts führt das Produkt zugleich als vegan; diese widersprüchliche Kennzeichnung sollte manuell geprüft werden."
        : "";
      return {
        verdict: "NICHT VEGAN",
        reason: `Tierische Zutat erkannt: ${uniqueAnimalIngredients.join(", ")}.${conflict}`,
        detectedIngredients: uniqueAnimalIngredients,
        hasVeganLabel: evidence.hasVeganLabel,
        conflict: evidence.saysVegan
      };
    }

    if (evidence.saysNonVegan && evidence.saysVegan) {
      return {
        verdict: "UNKLAR",
        reason: "Open Food Facts enthält widersprüchliche Vegan- und Nicht-Vegan-Kennzeichnungen. Produkt und Zutaten bitte manuell prüfen.",
        detectedIngredients: [],
        hasVeganLabel: evidence.hasVeganLabel,
        conflict: true
      };
    }

    if (evidence.saysNonVegan) {
      return {
        verdict: "NICHT VEGAN",
        reason: "Open Food Facts kennzeichnet das Produkt als nicht vegan. Die konkrete Zutat ist in den verfügbaren Zutatenangaben nicht eindeutig erkennbar.",
        detectedIngredients: [],
        hasVeganLabel: false,
        conflict: false
      };
    }

    const ambiguousMatches = findMatches(AMBIGUOUS_RULES, searchableText);
    const ambiguousIngredients = [...new Set(ambiguousMatches.map((match) => (
      match.name.startsWith("E470") && /^e/i.test(match.value)
        ? `${match.value.toUpperCase()} (Fettsäureester)`
        : match.name
    )))];

    if (ambiguousIngredients.length && !evidence.hasVeganLabel) {
      return {
        verdict: "UNKLAR",
        reason: `Herkunft unklar: ${ambiguousIngredients.join(", ")}. Prüfe die Herkunft beim Hersteller oder anhand einer verlässlichen Vegan-Kennzeichnung.`,
        detectedIngredients: [],
        ambiguousIngredients,
        hasVeganLabel: evidence.hasVeganLabel,
        conflict: false
      };
    }

    if (evidence.saysMaybeVegan && !evidence.saysVegan) {
      return {
        verdict: "UNKLAR",
        reason: "Open Food Facts stuft die Zutaten als möglicherweise vegan ein. Die genaue Herkunft der Zutaten bitte manuell prüfen.",
        detectedIngredients: [],
        hasVeganLabel: false,
        conflict: false
      };
    }

    if (!hasIngredientData && !evidence.hasVeganLabel) {
      return {
        verdict: "UNKLAR",
        reason: "Es fehlen Zutatenangaben und eine verlässliche Vegan-Kennzeichnung. Ohne ausreichende Angaben ist keine sichere Einschätzung möglich.",
        detectedIngredients: [],
        hasVeganLabel: false,
        conflict: false
      };
    }

    if (!hasIngredientData && evidence.hasVeganLabel) {
      return {
        verdict: "VEGAN",
        reason: "Open Food Facts führt das Produkt als vegan, aber es liegen keine Zutatenangaben zum Gegenprüfen vor. Die Kennzeichnung ist keine Garantie.",
        detectedIngredients: [],
        hasVeganLabel: evidence.hasVeganLabel,
        conflict: false
      };
    }

    return {
      verdict: "VEGAN",
      reason: evidence.saysVegan
        ? "Keine tierischen Zutaten erkannt. Open Food Facts stuft die Zutaten ebenfalls als vegan ein. Die Datenbankangaben sind keine Garantie."
        : "In den verfügbaren Zutatenangaben wurden keine bekannten tierischen oder ungeklärten Zutaten erkannt. Das ist keine Garantie.",
      detectedIngredients: [],
      hasVeganLabel: evidence.hasVeganLabel,
      conflict: false
    };
  }

  function toDisplayData(product = {}) {
    const ingredients = collectIngredients(product);
    const additives = Array.isArray(product.additives_tags)
      ? product.additives_tags.map((tag) => {
        const match = String(tag).match(/(?:^|:)e(\d+[a-z]?)(?:$|:)/i);
        return match ? `E${match[1].toUpperCase()}` : String(tag);
      })
      : [];
    const evidence = getVeganEvidence(product);

    return {
      name: product.product_name_de || product.product_name || "",
      ingredients: ingredients.text || ingredients.tags.join(", "),
      additives,
      analysis: analyzeProduct(product),
      hasVeganLabel: evidence.hasVeganLabel
    };
  }

  return { analyzeProduct, collectIngredients, toDisplayData };
});
