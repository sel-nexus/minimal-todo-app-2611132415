const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

/** Create a small DOM harness for the app's inline script. */
function createHarness() {
  const elements = new Map();

  class Element {
    constructor(tagName = "div") {
      this.tagName = tagName.toUpperCase();
      this.children = [];
      this.attributes = {};
      this.dataset = {};
      this.listeners = {};
      this.className = "";
      this.textContent = "";
      this.value = "";
      this.checked = false;
      this.hidden = false;
      this.type = "";
    }

    append(...children) {
      this.children.push(...children);
    }

    replaceChildren(...children) {
      this.children = [...children];
    }

    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }

    setAttribute(name, value) {
      this.attributes[name] = value;
    }

    get innerHTML() {
      return this.children.map((child) => child.outerHTML).join("");
    }

    get outerHTML() {
      const testId = this.dataset.testid ? ` data-testid="${this.dataset.testid}"` : "";
      const text = this.textContent ? escapeHtml(this.textContent) : "";
      return `<${this.tagName.toLowerCase()}${testId}>${text}${this.innerHTML}</${this.tagName.toLowerCase()}>`;
    }
  }

  function escapeHtml(value) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  for (const id of ["todo-form", "todo-input", "empty-state", "todo-list"]) {
    elements.set(id, new Element(id === "todo-list" ? "ul" : "div"));
  }

  const document = {
    getElementById(id) {
      return elements.get(id);
    },
    createElement(tagName) {
      return new Element(tagName);
    },
  };

  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script, "index.html contains an inline application script");
  elements.get("empty-state").textContent = html.match(/<p id="empty-state"[^>]*>([^<]*)<\/p>/)[1];
  const context = vm.createContext({ document });
  vm.runInContext(script[1], context, { filename: "index.html" });

  return {
    context,
    elements,
    getTodos: () => JSON.parse(vm.runInContext("JSON.stringify(todos)", context)),
  };
}

test("initial render exposes the exact empty state and empty list", () => {
  const { elements } = createHarness();
  assert.equal(elements.get("empty-state").textContent, "No tasks yet.");
  assert.equal(elements.get("empty-state").hidden, false);
  assert.equal(elements.get("todo-list").innerHTML, "");
});

test("add trims titles, clears input, and assigns sequential IDs", () => {
  const { context, elements, getTodos } = createHarness();
  const input = elements.get("todo-input");
  input.value = "  Buy milk  ";
  context.addTodo();
  input.value = "Walk dog";
  context.addTodo();

  const todos = getTodos();
  assert.deepEqual(todos, [
    { id: 1, title: "Buy milk", completed: false },
    { id: 2, title: "Walk dog", completed: false },
  ]);
  assert.equal(input.value, "");
  assert.deepEqual(elements.get("todo-list").children.map((item) => item.dataset.testid), [
    "todo-item-1",
    "todo-item-2",
  ]);
  assert.equal(elements.get("empty-state").hidden, true);
});

test("empty and whitespace-only input do not create tasks", () => {
  const { context, elements, getTodos } = createHarness();
  const input = elements.get("todo-input");
  input.value = "";
  context.addTodo();
  input.value = " \t  ";
  context.addTodo();

  assert.equal(getTodos().length, 0);
  assert.equal(elements.get("todo-list").innerHTML, "");
  assert.equal(elements.get("empty-state").hidden, false);
});

test("toggle changes only the selected task and renders completion styling", () => {
  const { context, elements, getTodos } = createHarness();
  elements.get("todo-input").value = "First";
  context.addTodo();
  elements.get("todo-input").value = "Second";
  context.addTodo();

  context.toggleTodo(1);
  const todos = getTodos();
  assert.deepEqual(todos.map((todo) => todo.completed), [true, false]);
  assert.equal(elements.get("todo-list").children[0].children[1].className, "todo-title completed");
  context.toggleTodo(1);
  assert.equal(getTodos()[0].completed, false);
});

test("delete removes only the selected task and restores empty state", () => {
  const { context, elements, getTodos } = createHarness();
  elements.get("todo-input").value = "First";
  context.addTodo();
  elements.get("todo-input").value = "Second";
  context.addTodo();

  context.deleteTodo(1);
  assert.deepEqual(getTodos().map((todo) => todo.id), [2]);
  assert.deepEqual(elements.get("todo-list").children.map((item) => item.dataset.testid), ["todo-item-2"]);
  context.deleteTodo(2);
  assert.equal(getTodos().length, 0);
  assert.equal(elements.get("empty-state").hidden, false);
  assert.equal(elements.get("todo-list").innerHTML, "");
});

test("task titles are rendered as text rather than interpreted as markup", () => {
  const { context, elements } = createHarness();
  elements.get("todo-input").value = "<img src=x onerror=alert(1)>";
  context.addTodo();

  const title = elements.get("todo-list").children[0].children[1];
  assert.equal(title.textContent, "<img src=x onerror=alert(1)>");
  assert.equal(title.children.length, 0);
});
