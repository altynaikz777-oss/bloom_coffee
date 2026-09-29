let grid = document.querySelector(".grid");
document.addEventListener("DOMContentLoaded", function () {
  async function add() {
    let url = `./data.json`;
    let promise = await fetch(url);
    let data = await promise.json();
    console.log(data);
    for (let i = 0; i < data.lenght; i++) {
      grid.innerHTML += `
  <div class="card">
          <img src="${data[i].image}" />
          <div class="card-content">
            <h3 class="card-title">${data[i].name}</h3>
            <p class="card-desc">
             ${data[i].description}
            </p>
            <div class="card-footer">
              <span class="price">$${data[i].price}</span>
              <a href="cart.html" class="btn-add">Add to cart</a>
            </div>
          </div>
        </div>`;
    }
  }
  add();
});
