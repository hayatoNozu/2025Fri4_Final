const detailDiv = document.getElementById("bookDetail");
const readingNowList = document.getElementById("readingNowList");
const resultsDiv = document.getElementById("results");

document.getElementById("searchButton").addEventListener("click", searchBooks);

async function searchBooks() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;

  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&langRestrict=ja`
  );
  const data = await response.json();

  resultsDiv.innerHTML = "";
  if (detailDiv) {
    detailDiv.innerHTML = "";
    detailDiv.classList.add("hidden");
  }

  if (!data.items || data.items.length === 0) {
    resultsDiv.textContent = "本が見つかりませんでした。";
    updateReadingNow();
    return;
  }

  data.items.forEach((book) => {
    const info = book.volumeInfo;
    const title = info.title || "タイトル不明";
    const thumbnail =
      info.imageLinks?.thumbnail ||
      "https://via.placeholder.com/128x180?text=No+Image";
    const authors = info.authors?.join(", ") || "著者不明";
    const description = info.description || "説明なし";
    const totalPages = info.pageCount || 0;

    const bookDiv = document.createElement("div");
    bookDiv.className = "book";

    // 進捗（読んだページ数）をlocalStorageから取得（なければ0）
    const savedPages = Number(localStorage.getItem(book.id + "_pages")) || 0;
    const progressPercent =
      totalPages > 0
        ? Math.min(100, Math.round((savedPages / totalPages) * 100))
        : 0;

    if (progressPercent === 100) {
      bookDiv.classList.add("completed");
    }

    const img = document.createElement("img");
    img.src = thumbnail;
    img.alt = `${title} の表紙`;
    bookDiv.appendChild(img);

    const titleElem = document.createElement("p");
    titleElem.textContent = title;
    bookDiv.appendChild(titleElem);

    // 本の情報をlocalStorageに保存（JSON文字列でまとめて）
    const storedBookInfo = {
      id: book.id,
      title: title,
      thumbnail: thumbnail,
      authors: authors,
      totalPages: totalPages,
    };
    localStorage.setItem(book.id + "_info", JSON.stringify(storedBookInfo));

    bookDiv.addEventListener("click", () => {
      if (!detailDiv) return;

      const savedPagesInner = Number(localStorage.getItem(book.id + "_pages")) || 0;
      const progressPercentInner =
        totalPages > 0
          ? Math.min(100, Math.round((savedPagesInner / totalPages) * 100))
          : 0;

      detailDiv.innerHTML = `
        <img src="${thumbnail}" alt="表紙" />
        <h2>${title}</h2>
        <p><strong>著者:</strong> ${authors}</p>
        <p>${description}</p>

        <hr />

        <p>総ページ数: ${
          totalPages > 0 ? totalPages + "ページ" : "不明"
        }</p>

        <label for="pagesInput">読んだページ数:</label>
        <input type="number" id="pagesInput" min="0" max="${
          totalPages > 0 ? totalPages : 10000
        }" value="${savedPagesInner}" />
        <button id="saveProgressBtn">保存</button>

        <p>進捗: <span id="progressPercent">${progressPercentInner}</span>%</p>

        <div id="progressBarContainer" style="
          margin-top: 10px; width: 100%; background: #eee; height: 20px; border-radius: 10px;">
          <div id="progressBar" style="
            height: 100%; width: ${progressPercentInner}%; background: #4caf50; border-radius: 10px; transition: width 0.3s ease;">
          </div>
        </div>
      `;

      detailDiv.classList.remove("hidden");
      detailDiv.scrollIntoView({ behavior: "smooth" });

      const saveBtn = document.getElementById("saveProgressBtn");
      saveBtn.onclick = () => {
        let pagesVal = Number(document.getElementById("pagesInput").value);
        if (isNaN(pagesVal) || pagesVal < 0) pagesVal = 0;
        if (totalPages > 0 && pagesVal > totalPages) pagesVal = totalPages;

        localStorage.setItem(book.id + "_pages", pagesVal);

        const newPercent =
          totalPages > 0
            ? Math.min(100, Math.round((pagesVal / totalPages) * 100))
            : 0;
        document.getElementById("progressPercent").textContent = newPercent;

        const progressBar = document.getElementById("progressBar");
        progressBar.style.width = newPercent + "%";

        alert("進捗を保存しました！");

        if (newPercent === 100) {
          bookDiv.classList.add("completed");
        } else {
          bookDiv.classList.remove("completed");
        }

        updateReadingNow(); // 進捗保存後に「今読み進めている本」更新
      };
    });

    resultsDiv.appendChild(bookDiv);
  });

  updateReadingNow();
}

// 「今読み進めている本」をlocalStorageから読み込んで表示する
function updateReadingNow() {
  readingNowList.innerHTML = "";

  const keys = Object.keys(localStorage);
  let foundAny = false;

  // keysにIDや「_pages」「_info」含まれるのでID一覧をユニークに取る工夫
  const bookIds = new Set();
  keys.forEach((key) => {
    if (key.endsWith("_pages")) {
      bookIds.add(key.replace("_pages", ""));
    }
  });

  if (bookIds.size === 0) {
    readingNowList.textContent = "今読み進めている本はありません。";
    return;
  }

  bookIds.forEach((id) => {
    const pages = Number(localStorage.getItem(id + "_pages")) || 0;
    if (pages > 0 && pages < 1000000) {
      // 本情報を取得
      const infoStr = localStorage.getItem(id + "_info");
      if (!infoStr) return; // 情報がなければ表示しない

      const info = JSON.parse(infoStr);
      const totalPages = info.totalPages || 0;
      const progressPercent =
        totalPages > 0
          ? Math.min(100, Math.round((pages / totalPages) * 100))
          : 0;
      
      // ← ここで100%なら非表示にしたいので、100%の場合は return でスキップ
      if (progressPercent === 100) {
        return; // 100%ならこの本は表示しない
      }
      foundAny = true;

      const itemDiv = document.createElement("div");
      itemDiv.className = "book reading-now";

      // 表紙画像
      const img = document.createElement("img");
      img.src = info.thumbnail;
      img.alt = `${info.title} の表紙`;
      img.style.width = "80px";
      img.style.display = "block";
      img.style.margin = "0 auto 5px";
      itemDiv.appendChild(img);

      // タイトルテキスト
      const titleElem = document.createElement("p");
      titleElem.textContent = info.title;
      titleElem.style.fontWeight = "bold";
      titleElem.style.fontSize = "14px";
      itemDiv.appendChild(titleElem);

      // 進捗テキスト
      const progressText = document.createElement("p");
      progressText.textContent = `進捗: ${progressPercent}% (${pages} / ${totalPages}ページ)`;
      progressText.style.fontSize = "13px";
      itemDiv.appendChild(progressText);

      // クリックで詳細表示（検索済みなら詳細表示可能）
      itemDiv.style.cursor = "pointer";
      itemDiv.addEventListener("click", () => {
        alert(
          "詳細を表示するには、検索して該当の本をクリックしてください。\n\n本のID: " +
            id
        );
      });

      readingNowList.appendChild(itemDiv);
    }
  });

  if (!foundAny) {
    readingNowList.textContent = "今読み進めている本はありません。";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  updateReadingNow();
});