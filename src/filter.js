//function for combined queries to firestore
import {
  and,
  doc,
  collection,
  query,
  getDoc,
  where,
  documentId,
  limit,
} from "firebase/firestore";

//function for combined query, using dietary tags as well as an array of ids from another firestore document from another collection
export async function multiQuery(
  db,
  thisCollection,
  activeFilters,
  docLimit,
  otherCollection,
  otherDocId,
  otherDocField,
) {
  const MAX_LIMIT = 99; // maximum number of items hardcoded
  if (docLimit === undefined || docLimit >= MAX_LIMIT) {
    docLimit = MAX_LIMIT;
  }

  //check if using array from other firestore document/collection
  if (!(otherDocField === undefined)) {
    const otherDocRef = doc(db, otherCollection, otherDocId);
    const otherDocSnap = await getDoc(otherDocRef);
    //if other doc exists, grab the array with ids
    if (otherDocSnap.exists()) {
      const docIdArray = otherDocSnap.get(otherDocField);
      //create where() for part of query
      if (!docIdArray || docIdArray.length === 0) {
        // Pass an array with a string that could never be a real ID (cant be empty)
        var whereOther = where(documentId(), "in", ["qwerty"]);
      } else {
        // Pass an array with ids
        var whereOther = where(documentId(), "in", docIdArray);
      }
    } else {
      // docSnap.data() will be undefined in this case
      console.log(
        //error log
        `No such document for collection: ${otherCollection}, and id: ${otherDocId}, and field: ${otherDocField}!`,
      );
      //empty where
      var whereOther;
    }
    //empty where
    var whereOther;
  }

  //create where() for dietary tags if they exist
  if (activeFilters.length === 0 || activeFilters == null) {
    //empty where
    var whereTags;
  } else {
    //create where() for dietary tags
    var whereTags = where("dietaryTags", "array-contains-any", activeFilters);
  }

  //put wheres in an array, remove invalid/empty because of errors
  const filters = [whereOther, whereTags].filter(
    (f) => f !== undefined && f !== null,
  );

  // create query for the collection with the above where statements
  const collectionRef = collection(db, thisCollection);
  const q = query(collectionRef, and(...filters), limit(docLimit));
  //returns the query
  return q;
}
