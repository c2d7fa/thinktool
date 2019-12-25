function update(): void {
  document.querySelector("#app").textContent = `The time is ${new Date().toISOString()}.`;
}

update();
window.setInterval(update, 27);
