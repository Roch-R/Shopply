async function check() {
  const { initializeApp } = await import("firebase/app");
  const { getFirestore, collection, getDocs } = await import("firebase/firestore");

  const firebaseConfig = {
    apiKey: "AIzaSyBwACrZ_RlcOvsrJ7nb4HZDcMFKSJ2gMww",
    authDomain: "roch-fdba7.firebaseapp.com",
    projectId: "roch-fdba7",
    storageBucket: "roch-fdba7.firebasestorage.app",
    messagingSenderId: "10342567270",
    appId: "1:10342567270:web:0c2989ffb9bd7bbe974ca7",
    measurementId: "G-R1WX76J30G"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log("Reading all users in database...");
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    console.log(`Total users in DB: ${querySnapshot.size}`);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`User ID: ${doc.id}`);
      console.log(`  Name: ${data.name}`);
      console.log(`  Email: ${data.username}`);
      console.log("------------------------");
    });
  } catch (err) {
    console.error("Error reading users:", err);
  }
}

check();
