//main page javascript
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { searchTextFirebaseCollection } from "./search.js";

// import style css
import "./styles/style.css";

//Creates search bar for restaurants in main page
document.addEventListener("DOMContentLoaded", () => {
  //checks if search bar is loaded
  const searchInput = document.querySelector(".search-floating-wrapper input");
  const searchWrapper = document.querySelector(".search-floating-wrapper");
  if (searchWrapper && searchInput) {
    //Create the Results Dropdown element
    const resultsDropdown = document.createElement("ul");
    resultsDropdown.className = "dropdown-menu shadow border-0 mt-2 w-100";
    resultsDropdown.style.display = "none"; // Hidden by default
    searchWrapper.appendChild(resultsDropdown);

    let debounceTimer;

    //Listen for user typing into search bar
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

    //Build the dropdown HTML
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
          container.appendChild(li);
        });
      }
      container.style.display = "block";
    }

    //Close dropdown when clicking outside of it
    document.addEventListener("click", (e) => {
      if (!searchWrapper.contains(e.target)) {
        resultsDropdown.style.display = "none";
      }
    });
  }
});
