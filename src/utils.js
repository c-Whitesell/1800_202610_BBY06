// Pop-up Loader

export function createIframePopup(element, location) {
  closeIframePopup();
  var theIframeContainer = document.createElement("div");
  theIframeContainer.classList.add("pop-up-iframe-container");
  theIframeContainer.id = "active-pop-up";

  var closeButton = document.createElement("button");
  closeButton.innerHTML = "&times;"; // The 'X' symbol
  closeButton.classList.add("pop-up-close-button");

  var theIframe = document.createElement("iframe");
  theIframe.classList.add("pop-up-iframe");
  theIframe.src = location;

  // Track the number of loads
  let loadCount = 0;

  closeButton.addEventListener("click", function (e) {
    e.stopPropagation(); // This is the standard method
    closeIframePopup(); // Refreshes the iframe
  });

  theIframe.addEventListener("load", function () {
    loadCount++;
    // Close if loaded another page
    if (loadCount > 1) {
      console.log("Source changed! Closing pop-up...");
      theIframeContainer.remove();
    }
  });

  theIframeContainer.appendChild(closeButton);
  theIframeContainer.appendChild(theIframe);
  element.appendChild(theIframeContainer);
}

// called from inside the iframe
function closeIframePopup() {
  const popUp = document.getElementById("active-pop-up");
  if (popUp) {
    popUp.remove();
  }
}
