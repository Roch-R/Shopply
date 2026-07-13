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

  console.log("Reading all typing documents in database...");
  try {
    const querySnapshot = await getDocs(collection(db, "typing"));
    console.log(`Total typing docs: ${querySnapshot.size}`);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`Doc ID: ${doc.id}`);
      console.log(`  Last Typed At: ${data.last_typed_at} (${new Date(data.last_typed_at).toISOString()})`);
      console.log("------------------------");
    });
  } catch (err) {
    console.error("Error reading typing docs:", err);
  }
}

check();
