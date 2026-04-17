// Pop-up Loader

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

// fuction to close pop-up
function closeIframePopup() {
  const popUp = document.getElementById("active-pop-up");
  if (popUp) {
    popUp.remove();
  }
}
