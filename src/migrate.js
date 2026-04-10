import { db } from "./firebaseConfig"; // Your firebase initialization
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteField,
  serverTimestamp, // <--- ADD THIS
} from "firebase/firestore";
import { createSearchMap } from "./search.js";

async function migrateRestaurantData() {
  const colRef = collection(db, "restaurants"); // Change to your actual collection name

  try {
    const querySnapshot = await getDocs(colRef);
    console.log(`Starting migration for ${querySnapshot.size} documents...`);

    // Use a loop to process each document
    for (const document of querySnapshot.docs) {
      const data = document.data();
      const docRef = doc(db, "restaurants", document.id);

      // 1. Create the new combined address string
      // Logic: "Street" + ", " + "City" + ", BC, Canada"
      const newAddress = `${data.address}, ${data.city}, BC, Canada`;

      var searchstring = createSearchMap(data.name, 10);
      searchstring = createSearchMap(data.address, 3, searchstring);

      searchstring = createSearchMap(data.cuisine || "", 3, searchstring);

      // 2. Prepare the updated object
      const updatedData = {
        address: newAddress,
        cuisine: data.cuisine || "unknown",
        lat: data.lat,
        lon: data.lon,
        name: data.name,
        website: data.website || "",
        dietaryTags: [], // Initializing as empty array
        posts: [], // Initializing as empty array
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        searchArray: searchstring,

        // 3. Remove the old 'city' and 'type' fields if you no longer need them
        city: deleteField(),
        type: deleteField(),
      };

      // 4. Update the document in Firestore
      await updateDoc(docRef, updatedData);
      console.log(`Updated: ${data.name}`);
    }

    console.log("✅ Migration complete!");
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

// To run it once, just call the function:
migrateRestaurantData();
