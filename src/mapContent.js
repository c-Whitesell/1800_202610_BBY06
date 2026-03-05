import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap";
import "./styles/style.css";
import "leaflet/dist/leaflet.css";

import * as L from "leaflet";

const map = L.map("map").setView([49.236, -123.025], 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
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
    console.error("Error fetching data from Overpass API:", error);
  }
}

console.log(map.getZoom()); //each lvl is doubling
console.log(map.getSize()); //x pixels and y pixels

// 3. Example Usage:
// Search for restaurants within 1km of a specific coordinate (e.g., Burnaby)
getNearbyRestaurants(49.236, -123.025, 6000).then((restaurants) => {
  if (restaurants) {
    console.log(`Found ${restaurants.length} restaurants.`);
    // console.log(restaurants);
    restaurants.forEach((node) => {
      // console.log(node.lat);
      // console.log(node.lon);
      L.marker([node.lat, node.lon]).addTo(map);
      // .bindPopup("A pretty CSS popup.<br> Easily customizable.")
      // .openPopup();
    });
  }
});
