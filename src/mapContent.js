import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import './styles/style.css';
import 'leaflet/dist/leaflet.css';
import { createIframePopup } from './utils.js'; // Note the relative path and file extension
import 'leaflet/dist/leaflet.css';

import * as L from 'leaflet';

import { db } from './firebaseConfig.js';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  arrayUnion,
  query, // <--- Add this
  where, // <--- Add this
  limit, // <--- Add this
  getDocs, // <--- You'll need this to actually run the query
} from 'firebase/firestore';

console.log('L', L);
let activeFilters = [];
let currentMarkers = [];

let userLat = null;
let userLng = null;

const map = L.map('map').setView([49.236, -123.025], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

async function getNearbyRestaurants(lat, lon, radius = 1000) {
  // 1. Define the Overpass QL query
  // This searches for nodes, ways, and relations tagged as restaurants
  // within the specified radius (in meters) [2, 6, 10].
  const query = `
    [out:json];
    (
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      way["amenity"="restaurant"](around:${radius},${lat},${lon});
      relation["amenity"="restaurant"](around:${radius},${lat},${lon});
    );
    out center;
  `;

  // 2. Use fetch to request data from a public Overpass instance
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.elements; // Array of restaurants [2]
  } catch (error) {
    console.error('Error fetching data from Overpass API:', error);
  }
}

async function getFirestoreRestaurants() {
  const LIMIT = 30;
  const qq = query(collection(db, 'restaurants'), limit(LIMIT));
  const querySnapshot = await getDocs(qq);

  const restaurantList = [];

  querySnapshot.forEach((doc) => {
    // Push a custom object into our array
    restaurantList.push({
      id: doc.id,
      name: doc.data().name,
      address: doc.data().address,
      lat: doc.data().lat,
      lon: doc.data().lon,
    });
  });
  return restaurantList;
}

//getFirestoreRestaurants();

console.log(map.getZoom()); //each lvl is doubling
console.log(map.getSize()); //x pixels and y pixels

// 3. Example Usage:
// Search for restaurants within 1km of a specific coordinate (e.g., Burnaby)
//getNearbyRestaurants(49.236, -123.025, 1000).then((restaurants) => {

loadFilteredMarkers();
// THIS is the original resturaunt handler.
// getFirestoreRestaurants().then((restaurants) => {
//   if (restaurants) {
//     console.log(`Found ${restaurants.length} restaurants.`);

//     restaurants.forEach((node) => {
//       // console.log(node.lat);
//       // console.log(node.lon);
//       // L.marker([node.lat, node.lon]).addTo(map);
//       // .bindPopup("A pretty CSS popup.<br> Easily customizable.")
//       // .openPopup();
//       //
//       //<b>${node.tags?.name || "Restaurant"}</b><br>

//       const marker = L.marker([node.lat, node.lon]).addTo(map);

//       marker.bindPopup(`
//       <b>${node.name || "Restaurant"}</b><br>
//       <i>${node.address || ""}</i><br>
//       <button class="route-btn">Route Here</button>
//       `);
//       marker.on("popupopen", (e) => {
//         const popupNode = e.popup.getElement();
//         const btn = popupNode.querySelector(".route-btn");

//         btn.addEventListener("click", () => {
//           if (!userLat || !userLng) {
//             alert("User location not ready yet");
//             return;
//           }

//           //Routing done by google
//           const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${node.lat},${node.lon}&travelmode=driving`;
//           window.open(googleMapsUrl, "_blank");
//         });
//       });
//     });
//   }
// });
//This is the user location
map.locate({ setView: true, maxZoom: 16 });

function onLocationFound(e) {
  var radius = e.accuracy;

  userLat = e.latlng.lat;
  userLng = e.latlng.lng;

  L.marker(e.latlng).addTo(map);
  L.circle(e.latlng, radius).addTo(map);
}

map.on('locationfound', onLocationFound);

//Creates the new post button and sets location
L.Control.MyCustomButton = L.Control.extend({
  options: {
    position: 'bottomleft', // Position the control in the bottom left
  },

  onAdd: function (map) {
    // Create the button element
    let container = L.DomUtil.create('button', 'modalButton');
    container.innerHTML = 'new post';
    container.style.height = '50px';
    container.style.width = '100px';
    container.style.borderRadius = '50px';
    container.style.backgroundColor = '#87A878';
    container.style.color = 'white';
    // Add a click event listener
    L.DomEvent.on(container, 'click', function (e) {
      // alert('Button clicked!');
      // add on click pop up here
      //window.location.href = "/post.html";
      createIframePopup(container, '/postPopup.html');
      // Prevent event from propagating to the map
      L.DomEvent.stop(e);
    });

    // Prevent click events on the button from moving the map
    L.DomEvent.disableClickPropagation(container);

    return container;
  },

  onRemove: function (map) {
    // Clean up event listeners if the control is removed
    L.DomEvent.off(this._container, 'click', function () {});
  },
});

//Adds the Favorite button
let myCustomButton = new L.Control.MyCustomButton();
myCustomButton.addTo(map);

L.Control.FavouritesButton = L.Control.extend({
  options: {
    position: 'bottomleft',
  },
  onAdd: function (map) {
    let container = L.DomUtil.create('button', 'favouritesButton');
    container.innerHTML = 'Favourites';
    container.style.height = '50px';
    container.style.width = '100px';
    container.style.borderRadius = '50px';
    container.style.backgroundColor = '#87A878';
    container.style.color = 'white';
    L.DomEvent.on(container, 'click', function (e) {
      window.location.href = '/favourite.html';
      L.DomEvent.stop(e);
    });
    L.DomEvent.disableClickPropagation(container);
    return container;
  },
  onRemove: function (map) {
    L.DomEvent.off(this._container, 'click', function () {});
  },
});

let favouritesButton = new L.Control.FavouritesButton();
favouritesButton.addTo(map);

function clearMarkers() {
  currentMarkers.forEach((marker) => map.removeLayer(marker));
  currentMarkers = [];
}

import { multiQuery } from './filter.js';

async function loadFilteredMarkers() {
  clearMarkers();

  const q = await multiQuery(
    db,
    'restaurants',
    activeFilters,
    50, // limit
  );

  const snapshot = await getDocs(q);

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const marker = L.marker([data.lat, data.lon]).addTo(map);

    marker.bindPopup(`
      <b>${data.name || 'Restaurant'}</b><br>
      <i>${data.address || ''}</i><br>
      <button class="route-btn">Route Here</button>
    `);

    marker.on('popupopen', (e) => {
      const popupNode = e.popup.getElement();
      const btn = popupNode.querySelector('.route-btn');

      btn.addEventListener('click', () => {
        if (!userLat || !userLng) {
          alert('User location not ready yet');
          return;
        }

        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${data.lat},${data.lon}&travelmode=driving`;
        window.open(googleMapsUrl, '_blank');
      });
    });

    currentMarkers.push(marker);
  });
}

window.toggleDropdown = function () {
  const dropdown = document.getElementById('filterDropdown');
  dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
};

window.handleFilterChange = async function (checkbox) {
  const tag = checkbox.value;

  if (checkbox.checked) {
    if (!activeFilters.includes(tag)) {
      activeFilters.push(tag);
    }
  } else {
    activeFilters = activeFilters.filter((t) => t !== tag);
  }

  await loadFilteredMarkers();
};

window.clearFilters = async function () {
  activeFilters = [];

  document
    .querySelectorAll("#filterDropdown input[type='checkbox']")
    .forEach((cb) => (cb.checked = false));

  await loadFilteredMarkers();
};
