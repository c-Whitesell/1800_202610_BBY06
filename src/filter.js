import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig.js';

//queries firestore for posts matching the tags.
//this is faster than if the client side logic was handling the filtering.i

export async function fetchPostsByTags(activeFilters, getAverageRating) {
  let q;

  if (activeFilters.length === 0) {
    q = query(collection(db, 'posts'));
  } else {
    q = query(
      collection(db, 'posts'),
      where('dietaryTags', 'array-contains-any', activeFilters),
    );
  }

  const snapshot = await getDocs(q);

  const posts = [];

  for (const docSnap of snapshot.docs) {
    const post = docSnap.data();

    posts.push({
      ...post,
      id: docSnap.id,
      avgRating: await getAverageRating(docSnap.id),
    });
  }

  return posts;
}
