/* Ativado somente quando compartilhado:true. Não lê nem escreve os documentos originais. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
export async function connect(config,onUser){
 if(!config?.projectId||!config?.apiKey||!config?.authDomain)throw Error('Configuração Firebase incompleta.');
 const app=initializeApp(config,'cantinho-extras');const auth=getAuth(app),db=getFirestore(app),col=collection(db,'cantinhoExtras');
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 getRedirectResult(auth).catch(e=>console.warn('Falha ao finalizar autenticação',e.code));
 onAuthStateChanged(auth,u=>setTimeout(()=>onUser(u),0));
 return {login:async()=>{try{await signInWithPopup(auth,provider);}catch(e){if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(e.code))await signInWithRedirect(auth,provider);else throw e;}},logout:()=>signOut(auth),watch:(onRows,onError)=>onSnapshot(col,s=>onRows(s.docs.map(d=>({...d.data(),id:d.id}))),onError),put:r=>setDoc(doc(col,r.id),r),remove:id=>deleteDoc(doc(col,id))};
}
