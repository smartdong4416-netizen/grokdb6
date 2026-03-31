import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  deleteDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
 
import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; // 因為匯入時時間會亂
 
 
// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyC7Zu0-CoPsUczRDK_7I4uHGVlA4j6ihT0",
  authDomain: "grokdb5.firebaseapp.com",
  projectId: "grokdb5",
  storageBucket: "grokdb5.firebasestorage.app",
  messagingSenderId: "810950683103",
  appId: "1:810950683103:web:fdd54a05587e9b5d61fc6a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

getDocs(collection(db, "notes")); // 預熱用 讓第一次連線不用等太久

// 清空輸入欄位
function clearInput(){
    document.getElementById("input_title").value = "";
    document.getElementById("input_category").value = "";
    document.getElementById("input_summary").value = "";
}

// 清空輸入按鈕
document.getElementById("clear_btn").addEventListener("click", () => {
    clearInput()
});


// 新增聊天資料
document.getElementById("add_note_btn").addEventListener("click", async () => {

    if (add_note_btn.disabled) return; // 防連點
    add_note_btn.disabled = true; // 上鎖

    const title = document.getElementById("input_title").value.trim(); // trim() 會只留內容
    const category = document.getElementById("input_category").value.trim();
    const summary = document.getElementById("input_summary").value.trim();

    if (!title || !category || !summary) {
        alert("請輸入完整資料");
        add_note_btn.disabled = false; // 解鎖
        return;
    }

    try {
        await addDoc(collection(db, "notes"), {
            title,
            category,
            summary,
            createdAt: serverTimestamp(), // 比較準的時間
            updatedAt: serverTimestamp()   // ⭐ 修正時間
        });

        clearInput()
        toastr.success( "新增成功！" );

    } catch (error) {
        console.error("新增失敗:", error);
        // alert("新增失敗，請看 console");
        toastr.error( "新增失敗" );
    }

    add_note_btn.disabled = false; // 解鎖
});


// 詳細面板
let unsubscribeChat = null;

let currentChatRef = null;
let currentChatText = "";

function openDetailPanel(id, data) { // 提供頁面格式 載入資料進來

    //document.getElementById("chat_input").value = "";
    //document.getElementById("big_textarea").value = ""; // 大型輸入框也清空重置

    const overlay = document.getElementById("overlay");
    overlay.classList.add("open");

    const panel = document.getElementById("detail_panel");
    panel.classList.add("open"); // 加入 open 類別 才會彈出來

    document.getElementById("detail_title").value = data.title || "";
    document.getElementById("detail_category").value = data.category || "";
    document.getElementById("detail_summary").value = data.summary || "";

    panel.dataset.id = id; // 把對應的 id 導入

    // 先取消舊監聽
    if (unsubscribeChat) unsubscribeChat();

    const chat_list = document.getElementById("chat_list");
    chat_list.innerHTML = "";

    // 照創建時間排序
    const chatQuery = query(
        collection(db, "notes", id, "chats"),
        orderBy("createdAt")
    ); 

    // 載入每條聊天訊息
    unsubscribeChat = onSnapshot(chatQuery, (snapshot) => {
        chat_list.innerHTML = "";

        /*
        snapshot.forEach(docSnap => {
            const chat = docSnap.data();

            const msg = document.createElement("div");
            msg.classList.add("chat-message"); // 加 chat-message 類別
            msg.textContent = chat.text;

            chat_list.appendChild(msg);
        });
        */
        snapshot.forEach(docSnap => {
            const chat = docSnap.data();

            const msg = document.createElement("div");
            msg.classList.add("chat-message");
            msg.textContent = chat.text;

            msg.addEventListener("click", () => {
                msg.classList.toggle("expanded");
            });


            // 右鍵事件 顯示其他功能
            msg.addEventListener("contextmenu", (e) => {
                //e.stopPropagation();
                e.preventDefault();    // ⭐ 關掉瀏覽器右鍵選單
                e.stopPropagation();   // ⭐ 防止影響外層

                const menu = document.getElementById("chat_menu");

                // 記住是哪一條
                currentChatRef = docSnap.ref;
                currentChatText = chat.text;

                // 顯示位置（滑鼠位置）
                menu.style.left = e.pageX + "px";
                menu.style.top = e.pageY + "px";

                menu.style.display = "block";
            });

            chat_list.appendChild(msg);
        });

        // 自動滾到底
        chat_list.scrollTop = chat_list.scrollHeight;
    });
}

/*
// 複製聊天
document.getElementById("copy_btn").addEventListener("click", async () => {
    if (!currentChatText) return;

    await navigator.clipboard.writeText(currentChatText);

    closeMenu();
});
*/

// fallback
function fallbackCopy(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;

    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand("copy");
        //alert("已複製！");
        toastr.success( "已複製！" );
    } catch (err) {
        //alert("複製失敗");
        toastr.error( "複製失敗" );
    }

    document.body.removeChild(textarea);
}

// 複製聊天 (瀏覽器版本)
document.getElementById("copy_btn").addEventListener("click", async () => {
    if (!currentChatText) return;

    try {
        await navigator.clipboard.writeText(currentChatText);
        //alert("已複製！");
        toastr.success( "已複製！" );
    } catch {
        fallbackCopy(currentChatText); // fallback
    }

    closeMenu();
});

// 導入聊天到大型輸入框
document.getElementById("import_btn").addEventListener("click", () => {
    if (!currentChatText) return;

    const bigTextarea = document.getElementById("big_textarea");

    // 塞內容
    bigTextarea.value = currentChatText;

    // 打開大型輸入框
    document.getElementById("big_input_box").classList.add("open");

    // 關閉右鍵選單
    closeMenu();
});

// 刪除聊天
document.getElementById("delete_chat_btn").addEventListener("click", async () => {
    if (!currentChatRef) return;

    const confirmDelete = confirm("確定刪除？");
    if (!confirmDelete) return;

    try {
        await deleteDoc(currentChatRef);
        toastr.success( "刪除成功！" );
    } catch (error) {
        console.error("刪除失敗:", error);
    }

    closeMenu();
});

// 關閉小框
document.addEventListener("click", () => {
    closeMenu();
});

function closeMenu() {
    const menu = document.getElementById("chat_menu");
    menu.style.display = "none";
}

// 新增每條聊天
document.getElementById("send_chat_btn").addEventListener("click", async () => {

    if (send_chat_btn.disabled) return; // 防連點
    send_chat_btn.disabled = true; // 上鎖

    const panel = document.getElementById("detail_panel");
    const noteId = panel.dataset.id; // 點到的那個 note 的 id

    const input = document.getElementById("chat_input");
    const text = input.value.trim();

    if (!text) {
        send_chat_btn.disabled = false; // 解鎖
        return;
    }

    try {
        await addDoc(collection(db, "notes", noteId, "chats"), {
            text,
            createdAt: serverTimestamp()
        });

        // ⭐ 新增：更新 note 的時間（讓它排到最上面）
        await updateDoc(doc(db, "notes", noteId), {
            updatedAt: serverTimestamp()
        });

        input.value = "";
        input.style.height = "auto";   // 這樣送出訊息後高度才會調回來

        //document.getElementById("big_textarea").value = ""; //清空大型輸入框內容

    } catch (error) {
        console.error("聊天新增失敗:", error);
    }

    send_chat_btn.disabled = false; // 解鎖
});




// 關閉 detail panel 頁面
document.getElementById("close_btn").addEventListener("click", () => {
    closePanel();
});

// 儲存修改 並在成功後關閉 detail panel 頁面
document.getElementById("save_btn").addEventListener("click", async () => {
    const panel = document.getElementById("detail_panel");
    const id = panel.dataset.id;

    const newTitle = document.getElementById("detail_title").value.trim();
    const newCategory = document.getElementById("detail_category").value.trim();
    const newSummary = document.getElementById("detail_summary").value.trim();

    if (!newTitle || !newCategory || !newSummary) {
        alert("請填完整資料");
        return;
    }

    try {
        await updateDoc(doc(db, "notes", id), {
            title: newTitle,
            category: newCategory,
            summary: newSummary,
            updatedAt: serverTimestamp()
        });

        panel.classList.remove("open"); // 收回 detail panel
        document.getElementById("overlay").classList.remove("open");
        toastr.success( "更新成功！" );

    } catch (error) {
        console.error("更新失敗:", error);
        alert("更新失敗");
    }
});


// 即時監聽資料（修正版）
const note_list = document.getElementById("note_list");

// 確保 createdAt 存在 新增的放在上面
const q = query(
    collection(db, "notes"),
    orderBy("updatedAt", "desc")
);

// 加入錯誤處理
onSnapshot(
    q,
    (snapshot) => {
        note_list.innerHTML = "";

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            const note = document.createElement("div");
            note.classList.add("note");
            note.dataset.id = docSnap.id;

            const deleteBtn = document.createElement("button"); // 刪除按鈕
            deleteBtn.classList.add("delete-btn");
            deleteBtn.textContent = "✕";

            // 防止點刪除時觸發卡片點擊
            deleteBtn.addEventListener("click", async (e) => {
                e.stopPropagation(); // 阻止當前事件繼續進行捕捉

                const confirmDelete = confirm("確定要刪除嗎？");
                if (!confirmDelete) return;

                try {
                    /*
                    const chatsRef = collection(db, "notes", docSnap.id, "chats");
                    const chatSnapshot = await getDocs(chatsRef);

                    chatSnapshot.forEach(async (chatDoc) => {
                        await deleteDoc(chatDoc.ref);
                    });
                    await deleteDoc(doc(db, "notes", docSnap.id));
                    */
                   const chatsRef = collection(db, "notes", docSnap.id, "chats"); // 先刪掉每條聊天內容
                   const chatSnapshot = await getDocs(chatsRef);

                    await Promise.all(
                        chatSnapshot.docs.map(chatDoc => deleteDoc(chatDoc.ref))
                    );

                    await deleteDoc(doc(db, "notes", docSnap.id)); // 再刪掉整個 note
                    toastr.success( "刪除成功！" );
                    
                } catch (error) {
                    console.error("刪除失敗:", error);
                    //alert("刪除失敗");
                    toastr.error( "刪除失敗" );
                }
            });

            // 內容
            const content = document.createElement("div");
            content.textContent =
                "標題 : " + (data.title || "") + '\n' +
                "類別 : " + (data.category || "") + '\n' +
                "摘要 : " + (data.summary || "");


            // 點擊卡片（開編輯）
            note.addEventListener("click", () => {
                openDetailPanel(docSnap.id, docSnap.data()); // 載入點到的這張卡的資訊進 detail panel
            });

            // 組裝
            note.appendChild(deleteBtn);
            note.appendChild(content);

            note_list.appendChild(note);
        });
    },
    (error) => {
        console.error("onSnapshot 錯誤:", error);
        alert("資料讀取失敗，請查看 console");
    }
);

/*
// 關閉遮罩
document.getElementById("overlay").addEventListener("click", (e) => {
    //const panel = document.getElementById("detail_panel");

    // 如果點到的是 panel 本身就不關
    if (e.target.closest("#detail_panel")) return;

    // 點到外面才關閉
    closePanel();
});
*/

// 關閉遮罩
const overlay = document.getElementById("overlay");

let isOutsideMouseDown = false;

// 按下
overlay.addEventListener("mousedown", (e) => {
  // 如果按在 panel 外
  if (!e.target.closest("#detail_panel") && !e.target.closest("#big_input_box")) {
    isOutsideMouseDown = true;
  } else {
    isOutsideMouseDown = false;
  }
});

// 放開
overlay.addEventListener("mouseup", (e) => {
  // 必須「按下 + 放開 都在外面」
  if (isOutsideMouseDown && !e.target.closest("#detail_panel")) {
    closePanel();
  }

  isOutsideMouseDown = false; // 重置
});

function closePanel() {
    document.getElementById("overlay").classList.remove("open");
    document.getElementById("detail_panel").classList.remove("open");
    document.getElementById("big_input_box").classList.remove("open"); // 隱藏大型輸入框

    if (unsubscribeChat) {
        unsubscribeChat();
        unsubscribeChat = null;
    }
}

// 自動調整高度
const chatInput = document.getElementById("chat_input");

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";

  const maxHeight = 80; // 要跟 CSS 一致 (現在每行高20 所以第4行以前不會出現滾輪)
  if (chatInput.scrollHeight > maxHeight) {
    chatInput.style.height = maxHeight + "px";
    chatInput.style.overflowY = "auto";   // 出現滾輪
  } else {
    chatInput.style.height = chatInput.scrollHeight + "px";
    chatInput.style.overflowY = "hidden"; // 不顯示滾輪
  }
});

// 再輸入時按 enter 可以送出
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault(); // 阻止換行
    document.getElementById("send_chat_btn").click();
  }
});


// toast 設定
toastr.options = {
  	// 參數設定
  	"closeButton": false, // 顯示關閉按鈕
  	"debug": false, // 除錯
  	"newestOnTop": false,  // 最新一筆顯示在最上面
  	"progressBar": true, // 顯示隱藏時間進度條
  	"positionClass": "toast-top-right", // 位置的類別 bottom left
  	"preventDuplicates": false, // 隱藏重覆訊息
  	"onclick": null, // 當點選提示訊息時，則執行此函式
  	"showDuration": "300", // 顯示時間(單位: 毫秒)
  	"hideDuration": "1000", // 隱藏時間(單位: 毫秒)
  	"timeOut": "3000", // 當超過此設定時間時，則隱藏提示訊息(單位: 毫秒)
  	"extendedTimeOut": "1000", // 當使用者觸碰到提示訊息時，離開後超過此設定時間則隱藏提示訊息(單位: 毫秒)
  	"showEasing": "swing", // 顯示動畫時間曲線
  	"hideEasing": "linear", // 隱藏動畫時間曲線
  	"showMethod": "fadeIn", // 顯示動畫效果
  	"hideMethod": "fadeOut" // 隱藏動畫效果
}
//toastr.success( "Success" );
//toastr.warning( "Warning" );
//toastr.error( "Error" ); 


// 顯示大型輸入框
const bigBox = document.getElementById("big_input_box");

document.getElementById("toggle_big_input").addEventListener("click", () => {
    bigBox.classList.toggle("open"); // 切換 (如果已經open 就把open移掉)
    //toggle_big_input.style = "background:red";
});

/*
// 把大型輸入框的內容傳給聊天 (套用)
document.getElementById("apply_big_text").addEventListener("click", () => {
    const bigText = document.getElementById("big_textarea").value;

    if (!bigText.trim()) return;

    const chatInput = document.getElementById("chat_input");

    chatInput.value = bigText;

    // 觸發自動高度調整
    chatInput.dispatchEvent(new Event("input"));
});
*/
document.getElementById("apply_big_text").addEventListener("click", async () => {

    const bigText = document.getElementById("big_textarea").value.trim();
    if (!bigText) return;

    const panel = document.getElementById("detail_panel");
    const noteId = panel.dataset.id;

    if (!noteId) return;

    try {
        // 直接寫進 chats
        await addDoc(collection(db, "notes", noteId, "chats"), {
            text: bigText,
            createdAt: serverTimestamp()
        });

        // 更新 note 排序
        await updateDoc(doc(db, "notes", noteId), {
            updatedAt: serverTimestamp()
        });

        // 清空大型輸入框
        document.getElementById("big_textarea").value = "";

        // 關閉大型輸入框（可選）
        //document.getElementById("big_input_box").classList.remove("open");

        //toastr.success("已送出！");

    } catch (error) {
        console.error("送出失敗:", error);
        toastr.error("送出失敗");
    }
});

// 關閉大型輸入框
document.getElementById("close_big_text").addEventListener("click", () => {
    document.getElementById("big_input_box").classList.remove("open"); 
});

// 清空大型輸入框內容
document.getElementById("clear_big_text").addEventListener("click", () => {
    document.getElementById("big_textarea").value = ""; 
});



// 匯出備份
document.getElementById("backup_btn").addEventListener("click", async () => {
    try {
        const notesSnapshot = await getDocs(collection(db, "notes"));

        const backupData = [];

        for (const noteDoc of notesSnapshot.docs) {
            const noteData = noteDoc.data();

            // 抓 chats 子集合
            const chatsSnapshot = await getDocs(
                collection(db, "notes", noteDoc.id, "chats")
            );

            const chats = chatsSnapshot.docs.map(chatDoc => ({
                id: chatDoc.id,
                ...chatDoc.data()
            }));

            backupData.push({
                id: noteDoc.id,
                ...noteData,
                chats
            });
        }

        // 轉 JSON
        const json = JSON.stringify(backupData, null, 2);

        // 下載
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        const filename = `firestore-backup-${getCurrentDateTimeString()}.json`;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);

        toastr.success("備份完成！");

    } catch (error) {
        console.error("備份失敗:", error);
        toastr.error("備份失敗");
    }
});

// 取得當前時間
function getCurrentDateTimeString() {
    const now = new Date();

    const pad = (n) => n.toString().padStart(2, "0");

    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());

    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}


// 匯入前詢問與讀取json
document.getElementById("restore_btn").addEventListener("click", () => {
    document.getElementById("restore_file").click();
});

document.getElementById("restore_file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const confirmRestore = confirm("這會清除所有現有資料，確定要匯入嗎？");
    if (!confirmRestore) return;

    const text = await file.text();
    const data = JSON.parse(text);

    await clearFirestore();   // ⭐ 先清空
    await restoreBackup(data); // ⭐ 再匯入

    e.target.value = ""; // 清掉上傳的檔案

    toastr.success("匯入完成！");
});

// 清空資料庫
async function clearFirestore() {
    const notesSnapshot = await getDocs(collection(db, "notes"));

    for (const noteDoc of notesSnapshot.docs) {

        // 先刪 chats 子集合
        const chatsSnapshot = await getDocs(
            collection(db, "notes", noteDoc.id, "chats")
        );

        await Promise.all(
            chatsSnapshot.docs.map(chatDoc => deleteDoc(chatDoc.ref))
        );

        // 再刪 note
        await deleteDoc(doc(db, "notes", noteDoc.id));
    }
}

// 還原資料
async function restoreBackup(data) {
    for (const note of data) {

        const noteRef = await addDoc(collection(db, "notes"), {
            title: note.title,
            category: note.category,
            summary: note.summary,
            createdAt: convertTimestamp(note.createdAt),
            updatedAt: convertTimestamp(note.updatedAt)
        });

        if (note.chats && note.chats.length > 0) {
            await Promise.all(
                note.chats.map(chat =>
                    addDoc(collection(db, "notes", noteRef.id, "chats"), {
                        text: chat.text,
                        createdAt: convertTimestamp(chat.createdAt)
                    })
                )
            );
        }
    }
}

// 匯入時間修正
function convertTimestamp(ts) {
    if (!ts) return serverTimestamp();

    // Firestore Timestamp JSON → 轉回 Timestamp
    if (ts.seconds !== undefined) {
        return new Timestamp(ts.seconds, ts.nanoseconds || 0);
    }

    return serverTimestamp();
}