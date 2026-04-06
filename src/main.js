import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import { db } from "./firebaseConfig.js";
import { addDoc, collection, doc, onSnapshot } from "firebase/firestore";
import { auth } from "/src/firebaseConfig.js";
import { searchTextFirebaseCollection } from "./search.js";

// If you have custom global styles, import them as well:
import "./styles/style.css";

// function sayHello() {}
// // document.addEventListener('DOMContentLoaded', sayHello);
// async function addPostData(event) {
//   event.preventDefault();

//   const foodTitle = document.getElementById('floatingInput');
//   const priceInput = document.getElementById('Price');
//   const description = document.getElementById('floatingTextarea2Disabled');

//   const food = foodTitle.value;
//   const price = parseFloat(priceInput.value);
//   const desc = description.value;

//   try {
//     await addDoc(collection(db, 'posts'), {
//       foodTitle: food,
//       price: price,
//       location: location,
//       description: desc,
//     });
//     foodTitle.value = '';
//     priceInput.value = '';
//     location.value = '';
//     description.value = '';
//   } catch (e) {
//     console.log('Error adding doc: ', e);
//   }
// }

// document.getElementById('submit').addEventListener('click', addPostData);

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
            "posts",
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
                    <a class="dropdown-item d-flex justify-content-between align-items-center py-2" href="postDetails.html?id=${item.id}">
                        <div>
                            <div class="fw-bold">${item.foodTitle}</div>
                            <small class="text-muted">${item.location || "Unknown Location"}</small>
                        </div>
                        <span class="badge rounded-pill bg-success">$${item.price}</span>
                    </a>
                `;
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
