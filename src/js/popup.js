import "../scss/theme.scss";
import UIKit from "uikit";
import Icons from "uikit/dist/js/uikit-icons";
import Mustache from "mustache";
import NotionClient from "./notion.js";
import thenChrome from "then-chrome";

UIKit.use(Icons);

const TEST_URL = "https://arxiv.org/abs/1810.00826";
const ARXIV_API = "http://export.arxiv.org/api/query/search_query";

class UI {
  constructor() {
    this.setupProgressBar();
    this.setupSaveButton();
    this.client = new NotionClient();
    this.connectionTest();
    this.getCurrentTabUrl();
  }

  getCurrentTabUrl() {
    document.addEventListener("DOMContentLoaded", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0].url;
        this.data = this.getPaperInfo(url);
      });
    });
  }

  async connectionTest() {
    chrome.storage.local.get("botId", async (d) => {
      if (!this.client.token) {
        const botId = d.botId;
        const data = await this.client.requestToken(botId);
        if (data.name == "UnauthorizedError") {
          this.renderMessage("danger", "You are not logged in notion.so.");
        } else {
          this.client.token = data.token;
        }
      }
      this.client.retrieveDatabase();
    });
  }

  setupSaveButton() {
    document.getElementById("js-save").addEventListener("click", async () => {
      this.showProgressBar();
      const data = await this.client.createPage(this.data);
      if (data.status && data.status == 400) {
        this.renderMessage("danger", `[${data.code}] ${data.message}`);
        return;
      } else {
        thenChrome.tabs.create({
          url: `https://notion.so/${data.id.replaceAll("-", "")}`,
        });
      }
    });
  }

  setupProgressBar() {
    this.progressBar = document.getElementById("js-progressbar");
  }

  showProgressBar() {
    clearInterval(this._animate);
    this.progressBar.value = 0;
    this._animate = setInterval(() => {
      this.progressBar.value += 20;
      if (this.progressBar.value >= this.progressBar.max) {
        clearInterval(this._animate);
      }
    }, 200);
  }
  isArxivUrl(url) {
    return url && url.indexOf("https://arxiv.org") === 0;
  }
  isPDF(url) {
    return url && url.split(".").pop() === "pdf";
  }
  async getPaperInfo(url) {
    if (this.isArxivUrl(url)) return this.getArXivInfo(url);
    //     if (this.isPDF(url)) return this.getPDFInfo(url); // TODO
  }
  parseArXivId(str) {
    const paperId = str.match(/\d+.\d+/);
    return paperId;
  }

  setFormContents(paperTitle, abst, authors) {
    document.getElementById("js-title").value = paperTitle;
    document.getElementById("js-abst").value = abst;
    authors.forEach((author) => {
      console.log(author);
      const template = `<span class="uk-badge uk-margin-small-right uk-margin-small-top">{{ text }}</span>`;
      const rendered = Mustache.render(template, { text: author });
      document
        .getElementById("js-chip-container")
        .insertAdjacentHTML("beforeend", rendered);
    });
  }

  async getArXivInfo(url) {
    this.showProgressBar();
    const paperId = this.parseArXivId(url);

    const res = await fetch(ARXIV_API + "?id_list=" + paperId.toString());
    if (res.status != 200) {
      console.log("[ERR] arXiv API request failed");
      return;
    }
    const data = await res.text(); // TODO: error handling
    console.log(res.status);
    const xmlData = new window.DOMParser().parseFromString(data, "text/xml");
    console.log(xmlData);

    const entry = xmlData.querySelector("entry");
    const paperTitle = entry.querySelector("title").textContent;
    const abst = entry.querySelector("summary").textContent;
    const authors = Array.from(entry.querySelectorAll("author")).map(
      (author) => {
        return author.textContent.trim();
      }
    );

    const published = entry.querySelector("published").textContent;
    const updated = entry.querySelector("updated").textContent;

    const primaryCategory = entry.getElementsByTagName("arxiv:primary_category")[0].getAttribute("term")
    const categories = Array.from(entry.getElementsByTagName("category")).map(category => category.getAttribute("term"));

    const pdfUrl = Array.from(entry.getElementsByTagName("link")).find(link => link.getAttribute("title") === "pdf").getAttribute("href");

    const paperInfo = {
      id: paperId,
      title: paperTitle,
      abst: abst,
      authors: authors,
      url: url,
      pdfUrl: pdfUrl,
      primaryCategory: primaryCategory,
      categories: categories,
      updated: updated,
      published: published,
    };

    console.log(paperInfo)

    this.setFormContents(paperTitle, abst, authors);
    //return { title: paperTitle, abst: abst, authors: authors, url: url };
    return paperInfo;
  }

  renderMessage(type, message, overwrite = false) {
    // type: warning, danger, success, primary
    const template = `<div class="uk-alert-{{type}}" uk-alert><a class="uk-alert-close" uk-close></a><p>{{message}}</p></div>`;
    const rendered = Mustache.render(template, {
      type: type,
      message: message,
    });
    if (overwrite) {
      document.getElementById("js-message-container").innerHTML = rendered;
    } else {
      document
        .getElementById("js-message-container")
        .insertAdjacentHTML("beforeend", rendered);
    }
  }
}

const ui = new UI();
