const inputField = document.getElementById("add-input");
const addBtn = document.getElementById("add-btn");
const itemsArea = document.getElementById("list-items");
const noItems = document.getElementById("no-items");
const itemsLeftElement = document.getElementById("items-left");
const dateElement = document.getElementById("date");
const toastContainer = document.getElementById("toast-container");
const filterButtons = {
    all: document.getElementById("filters-all"),
    purchased: document.getElementById("purchased"),
    "not-purchased": document.getElementById("not-purchased")
};

let items = [];
let currentFilter = "all";

const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2500);
};

const normalizeStatus = (value) => {
    if (value === true || value === "true" || value === "bought" || value === "purchased" || value === "done") {
        return "bought";
    }

    return "not-bought";
};

const normalizeItem = (item) => {
    const name = item?.item ?? item?.name ?? "";
    const status = normalizeStatus(item?.status ?? item?.purchased ?? false);

    return {
        id: String(item?._id ?? item?.id ?? Date.now() + Math.random()),
        item: name,
        status
    };
};

const isBought = (item) => normalizeStatus(item?.status) === "bought";

const updateDate = () => {
    dateElement.textContent = new Date().toLocaleDateString("en-GB");
};

const renderFilters = () => {
    Object.entries(filterButtons).forEach(([key, button]) => {
        const isActive = key === currentFilter;
        button.classList.toggle("active", isActive);
        button.classList.toggle("inactive", !isActive);
    });
};

const getVisibleItems = () => {
    if (currentFilter === "purchased") {
        return items.filter((item) => isBought(item));
    }

    if (currentFilter === "not-purchased") {
        return items.filter((item) => !isBought(item));
    }

    return items;
};

const escapeHtml = (value) =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

const displayItems = () => {
    const visibleItems = getVisibleItems();
    const remainingItems = items.filter((item) => !isBought(item)).length;

    itemsArea.innerHTML = visibleItems
        .map(
            (item) => `
                <li class="food-items-list ${isBought(item) ? "purchased" : ""}">
                    <label class="food-item">
                        <input type="checkbox" data-id="${item.id}" ${isBought(item) ? "checked" : ""}>
                        <span>${escapeHtml(item.item)}</span>
                    </label>
                </li>
            `
        )
        .join("");

    noItems.style.display = visibleItems.length === 0 ? "flex" : "none";
    itemsArea.style.display = visibleItems.length === 0 ? "none" : "flex";
    itemsLeftElement.textContent = remainingItems;
    renderFilters();
};

const addItemToDatabase = async (item) => {
    try {
        const res = await fetch("http://localhost:3000/api/items/add-item", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item, status: "not-bought" })
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Unable to add item", "error");
            return;
        }

        inputField.value = "";
        showToast(data.message || "Item added successfully", "success");
        getItems();
    } catch (error) {
        showToast("check your network connection and try again", "error");
        console.log(error);
    }
};

const getItems = async () => {
    try {
        const res = await fetch("http://localhost:3000/api/items/get-items", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || "Unable to fetch items", "error");
            return;
        }

        items = Array.isArray(data?.data) ? data.data.map(normalizeItem) : [];
        displayItems();
    } catch (error) {
        showToast("check your network connection and try again", "error");
        console.log(error);
    }
};

const updateItemStatusInDatabase = async (id, status) => {
    const endpoint = "http://localhost:3000/api/items/update-item-status";

    try {
        const res = await fetch(endpoint, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(data?.error || "Unable to update item status");
        }

        getItems();
        return data;
    } catch (error) {
        throw new Error(error?.message || "Unable to update item status");
    }
};

const setFilter = (filterName) => {
    currentFilter = filterName;
    displayItems();
};

addBtn.addEventListener("click", () => {
    const item = inputField.value.trim();

    if (!item) {
        showToast("enter an item!", "error");
        return;
    }

    addItemToDatabase(item);
});

inputField.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        const item = inputField.value.trim();

        if (!item) {
            showToast("enter an item!", "error");
            return;
        }

        addItemToDatabase(item);
    }
});

itemsArea.addEventListener("change", async (event) => {
    const checkbox = event.target;

    if (!checkbox.matches("input[type='checkbox']")) {
        return;
    }

    const itemId = String(checkbox.dataset.id);
    const item = items.find((entry) => String(entry.id) === itemId);

    if (!item) {
        return;
    }

    const nextStatus = checkbox.checked ? "bought" : "not-bought";
    const previousStatus = item.status;

    /*if (checkbox.checked) {
        const confirmed = confirm(`Mark "${item.item}" as bought?`);
        if (!confirmed) {
            checkbox.checked = previousStatus === "bought";
            return;
        }
    }*/

    try {
        checkbox.disabled = true;
        await updateItemStatusInDatabase(itemId, nextStatus);
        showToast(`"${item.item}" marked as ${nextStatus === "bought" ? "bought" : "not bought"}.`, "success");
    } catch (error) {
        checkbox.checked = previousStatus === "bought";
        showToast(error.message || "Unable to update item status", "error");
    } finally {
        checkbox.disabled = false;
    }
});

Object.entries(filterButtons).forEach(([filterName, button]) => {
    button.addEventListener("click", () => setFilter(filterName));
});

window.addEventListener("DOMContentLoaded", () => {
    updateDate();
    getItems();
});
