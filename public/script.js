const propertyList = document.querySelector("#property-list");
const searchInput = document.querySelector("#search-input");
const typeFilter = document.querySelector("#type-filter");
const filterForm = document.querySelector("#filter-form");
const emptyState = document.querySelector("#empty-state");
const errorState = document.querySelector("#error-state");
const resultCount = document.querySelector("#result-count");
const propertyDialog = document.querySelector("#property-dialog");

const typeNames = {
  house: "Nhà",
  apartment: "Căn hộ",
  land: "Đất nền"
};

function formatPrice(value) {
  return `${new Intl.NumberFormat("vi-VN").format(Number(value))} đ`;
}

function createCard(property) {
  const card = document.createElement("article");
  card.className = "property-card";

  const image = document.createElement("img");
  image.className = "card-image";
  image.src = property.image_url;
  image.alt = property.name;
  image.loading = "lazy";
  image.addEventListener("error", () => {
    image.hidden = true;
  }, { once: true });

  const content = document.createElement("div");
  content.className = "card-content";

  const topline = document.createElement("div");
  topline.className = "card-topline";

  const type = document.createElement("span");
  type.className = "property-type";
  type.textContent = typeNames[property.type] || property.type;
  topline.append(type);

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = property.name;

  const price = document.createElement("p");
  price.className = "card-price";
  price.textContent = formatPrice(property.price);

  const meta = document.createElement("p");
  meta.className = "card-meta";
  meta.textContent = `${Number(property.area)} m²`;

  const address = document.createElement("p");
  address.className = "card-address";
  address.textContent = property.address;

  const detailButton = document.createElement("button");
  detailButton.className = "detail-button";
  detailButton.type = "button";
  detailButton.textContent = "Xem chi tiết";
  detailButton.addEventListener("click", () => showDetails(property.id));

  content.append(topline, title, price, meta, address, detailButton);
  card.append(image, content);
  return card;
}

async function loadProperties() {
  propertyList.replaceChildren();
  emptyState.hidden = true;
  errorState.hidden = true;
  resultCount.textContent = "Đang tải...";

  const parameters = new URLSearchParams();
  if (searchInput.value.trim()) {
    parameters.set("search", searchInput.value.trim());
  }
  if (typeFilter.value) {
    parameters.set("type", typeFilter.value);
  }

  try {
    const response = await fetch(`/api/properties?${parameters.toString()}`);
    if (!response.ok) {
      throw new Error("Máy chủ không thể tải danh sách bất động sản.");
    }

    const properties = await response.json();
    resultCount.textContent = `${properties.length} bất động sản`;
    emptyState.hidden = properties.length > 0;
    properties.forEach((property) => propertyList.append(createCard(property)));
  } catch (error) {
    resultCount.textContent = "";
    errorState.textContent = `${error.message} Vui lòng thử tải lại trang.`;
    errorState.hidden = false;
  }
}

async function showDetails(id) {
  try {
    const response = await fetch(`/api/properties/${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error("Không thể tải thông tin chi tiết bất động sản.");
    }

    const property = await response.json();
    document.querySelector("#dialog-image").src = property.image_url;
    document.querySelector("#dialog-image").alt = property.name;
    document.querySelector("#dialog-type").textContent = typeNames[property.type] || property.type;
    document.querySelector("#dialog-title").textContent = property.name;
    document.querySelector("#dialog-price").textContent = formatPrice(property.price);
    document.querySelector("#dialog-meta").textContent = `Diện tích: ${Number(property.area)} m²`;
    document.querySelector("#dialog-address").textContent = `Địa chỉ: ${property.address}`;
    document.querySelector("#dialog-description").textContent = property.description;
    propertyDialog.showModal();
  } catch (error) {
    errorState.textContent = error.message;
    errorState.hidden = false;
  }
}

let searchTimer;
searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(loadProperties, 250);
});

typeFilter.addEventListener("change", loadProperties);
filterForm.addEventListener("reset", () => {
  window.setTimeout(loadProperties, 0);
});
document.querySelector("#dialog-close").addEventListener("click", () => propertyDialog.close());
propertyDialog.addEventListener("click", (event) => {
  if (event.target === propertyDialog) {
    propertyDialog.close();
  }
});

loadProperties();
