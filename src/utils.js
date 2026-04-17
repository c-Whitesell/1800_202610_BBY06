/**
 * FILE: utils.js
 * DESCRIPTION: Provides utility functions for UI components,
 * Has function to make iframe-based pop-up on page.
 * AUTHOR: BBY-06 Team
 * DATE: 2026-04-17
 */

/**
 * DESCRIPTION: Creates and injects an iframe popup into a target element.
 * Includes logic to auto-close the popup if the iframe redirects.
 * @param {HTMLElement} element - The parent container where the popup will be appended.
 * @param {string} location - The URL/path to be loaded within the iframe.
 * @returns {void}
 */
export function createIframePopup(element, location) {
  //Close existing pop-up on page
  closeIframePopup();
  // create i-frame container
  var theIframeContainer = document.createElement("div");
  theIframeContainer.classList.add("pop-up-iframe-container");
  theIframeContainer.id = "active-pop-up";
  // create close button
  var closeButton = document.createElement("button");
  closeButton.innerHTML = "&times;";
  closeButton.classList.add("pop-up-close-button");
  // create iframe
  var theIframe = document.createElement("iframe");
  theIframe.classList.add("pop-up-iframe");
  theIframe.src = location;

  // Track the number of loads
  let loadCount = 0;

  // close iframe popup on button click
  closeButton.addEventListener("click", function (e) {
    e.stopPropagation();
    closeIframePopup();
  });

  theIframe.addEventListener("load", function () {
    loadCount++;
    // Close if loaded another page (i.e. submitted form)
    if (loadCount > 1) {
      console.log("Source changed! Closing pop-up...");
      theIframeContainer.remove();
    }
  });

  theIframeContainer.appendChild(closeButton);
  theIframeContainer.appendChild(theIframe);
  element.appendChild(theIframeContainer);
}

/**
 * DESCRIPTION: Searches the DOM for the active popup by ID and removes it if present.
 * @returns {void}
 */
function closeIframePopup() {
  const popUp = document.getElementById("active-pop-up");
  if (popUp) {
    popUp.remove();
  }
}
