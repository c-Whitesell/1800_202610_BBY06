import {
  and,
  or,
  doc,
  getDocs,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
  where,
  documentId,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { db } from "./firebaseConfig.js";

//queries firestore for posts matching the tags.
//this is faster than if the client side logic was handling the filtering.i

export async function fetchPostsByTags(query, activeFilters, getAverageRating) {
  let q;

  if (activeFilters.length === 0) {
    q = query(collection(db, "posts"));
  } else {
    q = query(
      collection(db, "posts"),
      where("dietaryTags", "array-contains-any", activeFilters),
    );
  }

  const snapshot = await getDocs(q);

  const posts = [];

  for (const docSnap of snapshot.docs) {
    const post = docSnap.data();

    /*     posts.push({
      ...post,
      id: docSnap.id,
      avgRating: await getAverageRating(docSnap.id),
    }); */
  }

  return posts;
}

export async function multiQuery(
  db,
  thisCollection,
  activeFilters,
  docLimit,
  otherCollection,
  otherDocId,
  otherDocField,
) {
  const MAX_LIMIT = 99; // maximum number of items
  if (docLimit === undefined || docLimit >= MAX_LIMIT) {
    docLimit = MAX_LIMIT;
  }

  if (!(otherDocField === undefined)) {
    const otherDocRef = doc(db, otherCollection, otherDocId);
    const otherDocSnap = await getDoc(otherDocRef);

    if (otherDocSnap.exists()) {
      const docIdArray = otherDocSnap.get(otherDocField);
      console.log("Getting document IDs");
      console.log(docIdArray);
      if (!docIdArray || docIdArray.length === 0) {
        // Pass an array with a string that could never be a real ID
        var whereOther = where(documentId(), "in", ["penis"]);
      } else {
        var whereOther = where(documentId(), "in", docIdArray);
      }
    } else {
      // docSnap.data() will be undefined in this case
      console.log(
        `No such document for collection: ${otherCollection}, and id: ${otherDocId}, and field: ${otherDocField}!`,
      );
      var whereOther;
    }
    var whereOther;
  }

  if (activeFilters.length === 0 || activeFilters == null) {
    var whereTags;
  } else {
    var whereTags = where("dietaryTags", "array-contains-any", activeFilters);
  }

  // 1. Define your potential filters
  const filters = [whereOther, whereTags].filter(
    (f) => f !== undefined && f !== null,
  );
  //console.log(filters);
  // 2. Apply the query
  // Note: If filters.length is 0, you might want to fetch all docs
  // or skip the and() entirely.
  const collectionRef = collection(db, thisCollection);
  const q = query(collectionRef, and(...filters), limit(docLimit));
  //console.log(query);
  return q;
}
