/* Firebase Web SDK. Nenhuma credencial administrativa. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
export async function connect(config,onUser){
 const app=initializeApp(config,'cantinho-extras');const auth=getAuth(app),db=getFirestore(app),col=collection(db,'cantinhoExtras');
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 await setPersistence(auth,browserLocalPersistence);
 onAuthStateChanged(auth,u=>setTimeout(()=>onUser(u),0));
 return {login:()=>signInWithPopup(auth,provider),logout:()=>signOut(auth),watch:(onRows,onError)=>onSnapshot(col,{includeMetadataChanges:true},s=>onRows(s.docs.map(d=>({...d.data(),id:d.id})),s.metadata),onError),put:r=>setDoc(doc(col,r.id),r),remove:id=>deleteDoc(doc(col,id))};
}
