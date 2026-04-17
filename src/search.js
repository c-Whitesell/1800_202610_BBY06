/**
 * FILE: search.js
 * DESCRIPTION: Has functions for creating soundex for a string and creating a searchmap from soundex data
 * AUTHOR: BBY-06 Team
 * REFERENCE: https://code.build/p/firestore-fuzzy-full-text-search-Ut2Smh?ref=dailydev
 */
import { db } from "./firebaseConfig.js";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

/**
 * DESCRIPTION: Take a string word, and return the soundex code
 * @param {string} s - The input word string to convert.
 * @returns {string} - The Soundex code string.
 */
export function soundex(s) {
  const a = s.toLowerCase().split("");
  const f = a.shift();
  let r = "";
  const codes = {
    a: "",
    e: "",
    i: "",
    o: "",
    u: "",
    b: 1,
    f: 1,
    p: 1,
    v: 1,
    c: 2,
    g: 2,
    j: 2,
    k: 2,
    q: 2,
    s: 2,
    x: 2,
    z: 2,
    d: 3,
    t: 3,
    l: 4,
    m: 5,
    n: 5,
    r: 6,
  };

  r =
    f +
    a
      .map((v) => codes[v])
      .filter((v, i, b) => (i === 0 ? v !== codes[f] : v !== b[i - 1]))
      .join("");

  return (r + "000").slice(0, 4).toUpperCase();
}

/**
 * DESCRIPTION: Breaks text into n-grams, converts them to Soundex, and builds
 * a frequency based search map for Firestore indexing.
 * @param {string} text - The raw text to index (e.g., Restaurant Name).
 * @param {number} weight - Multiplier for relevance ranking.
 * @param {Object} m - Existing search map to append to (optional).
 * @returns {Object} - The search map.
 */
export function createSearchMap(text, weight = 1, m) {
  const NUMBER_OF_WORDS = 3; //limit of words for search-map

  // regex matches any alphanumeric from any language and strips spaces
  const finalArray = [];

  const wordArray = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ") // Keeps letters and numbers only
    .replace(/ +/g, " ") // Collapses multiple spaces into one
    .trim() // Removes leading/trailing whitespace
    .split(" ");

  // Safety check: if text was empty, split(' ') might return ['']
  if (wordArray.length === 1 && wordArray[0] === "") return [];

  do {
    // Take a slice of the first N words
    finalArray.push(wordArray.slice(0, NUMBER_OF_WORDS).join(" "));

    // Remove the first word to "slide" the window forward
    wordArray.shift();
  } while (wordArray.length !== 0);

  let index = finalArray;

  const temp = [];

  // Translate to soundex
  for (const i of index) {
    temp.push(
      i
        .split(" ")
        .map((v) => soundex(v))
        .join(" "),
    );
  }

  index = temp;
  if (typeof m !== "undefined" && m !== null) {
    // searchmap exists
  } else {
    // searchmap doesn't exist, initialize it
    var m = {};
  }
  // Add each iteration from the createIndex
  for (const phrase of index) {
    if (phrase) {
      let v = "";
      const t = phrase.split(" ");
      while (t.length > 0) {
        const r = t.shift();
        v += v ? " " + r : r;

        // Increment for relevance by weight(importance)
        m[v] = (m[v] || 0) + 1 * weight;
      }
    }
  }
  return m;
}

/**
 * DESCRIPTION: Performs a search against a Firestore collection using
 * the search map field of the document.
 * DATABASE ACCESS: QUERY (Collection filtered and ordered by search map match)
 * @param {string} text - The user's search query.
 * @param {string} collectionName - The Firestore collection to search (e.g., "restaurants").
 * @returns {Promise<Array>} - Resolves to an array of document data objects.
 */
export async function searchTextFirebaseCollection(text, collectionName) {
  // Convert search text to soundex
  const searchText = text
    .trim()
    .split(" ")
    .map((v) => soundex(v))
    .join(" ");

  // Query Firestore: Order by the soundex, highest frequency first
  const q = query(
    collection(db, collectionName),
    orderBy(`searchArray.${searchText}`, "desc"),
    limit(5),
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
