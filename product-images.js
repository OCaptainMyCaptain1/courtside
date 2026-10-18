// ---------- Product photos: the one place to edit ----------
//
// To add a real photo for a product:
//   1. Save the image in the images folder (about 600 x 450 pixels works well for the shop pages).
//   2. Fill in src, alt, creditName, and creditUrl for that product below.
//
// While src is empty, the shop page shows a "Photo coming soon" placeholder (and the cart and
// checkout show a small matching tile). Once src is filled in, the photo appears everywhere.
//
// alt:         describe what is actually IN the photo, for people who can't see it (rewrite it to match your photo)
// creditName:  the photographer's name as shown on Unsplash
// creditUrl:   the link to the photographer's Unsplash page (copy it from the "Photo by" credit on Unsplash)
//
// The names on the left must match each product's name exactly, because the cart uses them too.
// To give a Services item a photo, add an entry for it here (for example "Racquet Stringing") and it will show up.

const PRODUCT_IMAGES = {
  // ----- Snack Shop -----
  "Trail Mix":            { src: "", alt: "A bowl of trail mix with nuts, dried fruit, and chocolate pieces", creditName: "", creditUrl: "" },
  "Sports Drink":         { src: "", alt: "A bottle of sports drink", creditName: "", creditUrl: "" },
  "Protein Bar":          { src: "", alt: "A protein bar", creditName: "", creditUrl: "" },
  "Bottled Water":        { src: "", alt: "A bottle of water", creditName: "", creditUrl: "" },

  // ----- Pro Shop -----
  "Performance Racquet":  { src: "", alt: "A tennis racquet", creditName: "", creditUrl: "" },
  "Replacement Grip Tape": { src: "", alt: "A roll of tennis grip tape", creditName: "", creditUrl: "" },
  "Tennis Bag":           { src: "", alt: "A tennis bag", creditName: "", creditUrl: "" },
  "Wristbands (2-Pack)":  { src: "", alt: "Two sweat-wicking wristbands", creditName: "", creditUrl: "" },
  "Grommet/Headguard Set": { src: "", alt: "A set of racquet grommets and a headguard", creditName: "", creditUrl: "" }
};

// ---------- Helpers used by the shop pages, the cart, and checkout ----------

// "Trail Mix" -> "TM", "Tennis Bag" -> "TB", "Wristbands (2-Pack)" -> "W"
function productInitials(name) {
  const words = name.split(" ").filter(function (word) {
    return /^[A-Za-z]/.test(word);
  });
  return words.slice(0, 2).map(function (word) {
    return word.charAt(0).toUpperCase();
  }).join("");
}

function escapeForHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// The full photo block for a shop page card: the photo (or placeholder) with its Unsplash credit underneath.
// Returns null if the product has no entry above.
function buildProductPhoto(name) {
  const info = PRODUCT_IMAGES[name];
  if (!info) return null;

  const figure = document.createElement("figure");
  figure.className = "product-photo";

  if (info.src) {
    const image = document.createElement("img");
    image.src = info.src;
    image.alt = info.alt;
    image.width = 600;   // width and height reserve the space so the page doesn't jump while images load
    image.height = 450;
    image.loading = "lazy";
    figure.appendChild(image);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "photo-placeholder";
    placeholder.setAttribute("aria-hidden", "true");

    const initials = document.createElement("span");
    initials.className = "photo-placeholder-initials";
    initials.textContent = productInitials(name);

    const label = document.createElement("span");
    label.className = "photo-placeholder-label";
    label.textContent = "Photo coming soon";

    placeholder.append(initials, label);
    figure.appendChild(placeholder);
  }

  // Credit line: "Photo by [name] on Unsplash". The name is left blank until a photo is chosen.
  const caption = document.createElement("figcaption");
  caption.className = "photo-credit";
  caption.append("Photo by ");

  if (info.creditName) {
    const photographer = document.createElement("a");
    photographer.href = info.creditUrl || "https://unsplash.com";
    photographer.target = "_blank";
    photographer.rel = "noopener";
    photographer.textContent = info.creditName;
    caption.appendChild(photographer);
  } else {
    const blank = document.createElement("span");
    blank.className = "credit-blank";
    blank.innerHTML = "&nbsp;";
    caption.appendChild(blank);
  }

  const unsplash = document.createElement("a");
  unsplash.href = "https://unsplash.com";
  unsplash.target = "_blank";
  unsplash.rel = "noopener";
  unsplash.textContent = "Unsplash";
  caption.append(" on ", unsplash);

  figure.appendChild(caption);
  return figure;
}

// A small square version for the cart panel and the checkout summary ("" if the product has no entry).
// The product's name is written right beside it, so the picture itself is left out of screen readers (alt="").
function productThumbHTML(name) {
  const info = PRODUCT_IMAGES[name];
  if (!info) return "";

  if (info.src) {
    return `<img class="item-thumb" src="${escapeForHtml(info.src)}" alt="" width="64" height="64" loading="lazy">`;
  }
  return `<span class="item-thumb item-thumb-placeholder" aria-hidden="true">${escapeForHtml(productInitials(name))}</span>`;
}
