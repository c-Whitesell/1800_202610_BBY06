import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import { db } from './firebaseConfig.js';
import { addDoc, collection, doc, onSnapshot } from 'firebase/firestore';
import { auth } from '/src/firebaseConfig.js';

// If you have custom global styles, import them as well:
import './styles/style.css';

function sayHello() {}
// document.addEventListener('DOMContentLoaded', sayHello);
async function addPostData(event) {
  event.preventDefault();

  const foodTitle = document.getElementById('floatingInput');
  const priceInput = document.getElementById('Price');
  const description = document.getElementById('floatingTextarea2Disabled');

  const food = foodTitle.value;
  const price = parseFloat(priceInput.value);
  const desc = description.value;

  try {
    await addDoc(collection(db, 'posts'), {
      foodTitle: food,
      price: price,
      location: location,
      description: desc,
    });
    foodTitle.value = '';
    priceInput.value = '';
    location.value = '';
    description.value = '';
  } catch (e) {
    console.log('Error adding doc: ', e);
  }
}

document.getElementById('submit').addEventListener('click', addPostData);
