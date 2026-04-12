import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { db } from "./firebaseConfig.js";
import { addDoc, collection, doc, onSnapshot } from "firebase/firestore";
import { auth } from "/src/firebaseConfig.js";
import { searchTextFirebaseCollection } from "./search.js";

// If you have custom global styles, import them as well:
import "./styles/style.css";

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.querySelector(".search-floating-wrapper input");
  const searchWrapper = document.querySelector(".search-floating-wrapper");
  if (searchWrapper && searchInput) {
    // 1. Create the Results Dropdown element
    const resultsDropdown = document.createElement("ul");
    resultsDropdown.className = "dropdown-menu shadow border-0 mt-2 w-100";
    resultsDropdown.style.display = "none"; // Hidden by default
    searchWrapper.appendChild(resultsDropdown);

    let debounceTimer;

    // 2. Listen for typing
    searchInput.addEventListener("input", (e) => {
      const queryText = e.target.value.trim();

      // Clear timer on every keystroke
      clearTimeout(debounceTimer);

      if (queryText.length < 2) {
        resultsDropdown.style.display = "none";
        return;
      }

      // Wait 300ms after user stops typing to call Firebase
      debounceTimer = setTimeout(async () => {
        try {
          const results = await searchTextFirebaseCollection(
            queryText,
            "restaurants",
          );
          renderResults(results, resultsDropdown);
        } catch (error) {
          console.error("Search failed:", error);
        }
      }, 300);
    });

    // 3. Function to build the dropdown HTML
    function renderResults(data, container) {
      container.innerHTML = ""; // Clear old results

      if (data.length === 0) {
        container.innerHTML = `<li><span class="dropdown-item-text text-muted">No matches found</span></li>`;
      } else {
        data.forEach((item) => {
          const li = document.createElement("li");
          li.innerHTML = `
                    <a class="dropdown-item d-flex justify-content-between align-items-center py-2" href="allPosts.html?id=${item.id}&type=restaurants">
                        <div>
                            <div class="fw-bold">${item.name}</div>
                            <small class="text-muted">${item.address || "Unknown Location"}</small>
                        </div>
                        
                    </a>
                `;
          // <div>
          //             <div class="fw-bold">${item.foodTitle}</div>
          //             <small class="text-muted">${item.location || "Unknown Location"}</small>
          //         </div>
          //<span class="badge rounded-pill bg-success">$${item.price}</span>
          container.appendChild(li);
        });
      }
      container.style.display = "block";
    }

    // 4. Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!searchWrapper.contains(e.target)) {
        resultsDropdown.style.display = "none";
      }
    });
  }
});
