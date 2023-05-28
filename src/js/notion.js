export default class Notion {
  constructor() {
    this.token = null;
    this.apiBase = "https://api.notion.com/v1/";
  }

  torkenizedHeaders() {
    return {
      "Content-Type": "application/json",
      "Notion-Version": "2021-05-13",
      Authorization: `Bearer ${this.token}`,
    };
  }

  async requestToken(botId) {
    const url = "https://www.notion.so/api/v3/getBotToken";
    const body = { botId: botId };
    const headers = {
      Accept: "application/json, */*",
      "Content-type": "application/json",
    };
    const res = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: headers,
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return data;
  }

  async retrievePage(pageId) {
    try {
      const url = this.apiBase + `pages/${pageId}`;
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        headers: this.torkenizedHeaders(),
      });
      const data = await res.json();
      console.log(data);
    } catch (err) {
      throw err;
    }
  }

  async createPage(_data) {
    const data = await _data;
    const databaseId = document.getElementById("js-select-database").value;
    const title = data.title;
    const abst = data.abst;
    const paperUrl = data.url;
    const authorsFormatted = data.authors.join(",");
    const updated = data.updated;
    const published = data.published;
    const primaryCategory = data.primaryCategory;
    const categories = data.categories;
    const pdfUrl = data.pdfUrl;

    try {
      const url = this.apiBase + "pages";
      const parent = {
        type: "database_id",
        database_id: databaseId,
      };

      const properties = {
        Title: { 
          id: "title", 
          type: "title", 
          title: [
            { 
              text: { content: title } 
            }
          ],
        },
        Publisher: { 
          id: "conference", 
          type: "select", 
          select: { name: "arXiv" }, 
        },
        URL: { 
          id: "url", 
          type: "url", 
          url: paperUrl, 
        },
        Abstract: { 
          id: "abstract",
          type: "rich_text", 
          rich_text: [
            {
              type: "text", 
              text: { content: abst, link: null },
              annotations: { bold: false, italic: true, strikethrough: false, underline: false, code: false, color: "default", },
              plain_text: abst,
              href: null,
            },
          ],
        },
        Authors: { 
          id: "authors",
          type: "rich_text",
          rich_text: [
            {
              type: "text",
              text: { content: authorsFormatted, link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: authorsFormatted,
              href: null,
            },
          ],
        },
        "Updated Date": {
          id: "updated", type: "date", date: { start: updated },
        },
        "Published Date": {
          id: "published", type: "date", date: { start: published },
        },
        "Primary Category": {
          id: "primary", type: "select", select: { name: primaryCategory },
        },
        "Categories": {
          id: "categories", type: "multi_select", multi_select: categories.map((x) => {
            return { name: x };
          }),
        },
        "PDFLink": {
          id: "pdflink", type: "url", url: pdfUrl,
        }
      };

      console.log({"properties:": properties});

      const body = {
        parent: parent,
        properties: properties,
      };
      const res = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: this.torkenizedHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log(data);
      return data;
    } catch (err) {
      throw err;
    }
  }

  async retrieveDatabase() {
    try {
      const url = this.apiBase + "databases";
      const headers = this.torkenizedHeaders();
      console.log(headers);
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        headers: headers,
      });
      const data = await res.json();

      data.results.forEach((result) => {
        const option = `<option value=${result.id}>${result.title[0].text.content}</option>`;
        document
          .getElementById("js-select-database")
          .insertAdjacentHTML("beforeend", option);
      });
      console.log(data);
    } catch (err) {
      console.log("[ERR] " + err);
      throw err;
    }
  }
}
