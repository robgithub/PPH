"use strict";
console.log("PPH");
var index=0;
var listLength=0;
var imagePath="";
var usageIndex=0;
var slideShow=-1; // -1 waiting for list. 0 no slide. 1 delay amount
var delay=3000; //ms this amount(after image loads)
var timeoutHandle=null; // set by setTimeout

function createElements() {
    let element = null;
    let subElement = null;
    element = document.createElement('img');
    element.id="display-image";
    document.querySelector("#app").append(element);

    element = document.createElement('div');
    element.id="status";
    document.querySelector("#app").append(element);
    element.innerHTML = "list empty";

    element = document.createElement('div');
    element.id="button-prev";
    element.className = "go-button";
    subElement = document.createElement('div');
    subElement.className = "button-control";
    subElement.innerHTML = "&lt;";
    element.append(subElement);
    document.querySelector("#app").append(element);

    element = document.createElement('div');
    element.id="button-next";
    element.className = "go-button";
    subElement = document.createElement('div');
    subElement.className = "button-control";
    subElement.innerHTML = "&gt;";
    element.append(subElement);
    document.querySelector("#app").append(element);
}

createElements();
//loadList();
bindClickEvents();
//bindTouchEvents();
displayElements();
initialListStatus();

function initialListStatus() {
    fetch('/api/statuslist')
      .then(response => response.json())
      .then(data => {
        var element = document.querySelector("#status");
        listLength = data.listLength;
        element.innerHTML = "Inital list " + listLength;
        if (listLength > 0) {
            document.querySelector("#slide-index").max = listLength;
            updateImage();
            slideShow=0; // default to NOT sliding
            setSlide(document.querySelector("#button-pause"), "slide-running");
        }
    });
}

function bindTouchEvents() {
    let buttons = document.querySelectorAll(".go-button");
    for (let i=0;i<buttons.length;i++) {
         buttons[i].addEventListener("touchend", function(event) {
             inhibitTouch(event);
//             event.preventDefault();
        }, false);
    }
}

function bindClickEvents() {
    document.querySelector("#display-image").addEventListener("click", function(event) {
         nextImage();
         event.preventDefault();
         event.stopPropagation();
    }, false);
    document.querySelector("#button-next").addEventListener("click", function(event) {
         nextImage();
         event.preventDefault();
         event.stopPropagation();
    }, false);
    document.querySelector("#button-prev").addEventListener("click", function(event) {
         if (timeoutHandle) clearTimeout(timeoutHandle);
         index--;
         if (index<0) index=listLength-1;
         updateImage();
         updateStatus();
         event.preventDefault();
         event.stopPropagation();
    }, false);
    document.querySelector("#button-pause").addEventListener("click", function(event) {
         toggleVisibility(this);
         if (slideShow != -1) {
             if (slideShow == 0) {
                 delay = 1000 * parseInt(document.querySelector("#slide-delay").value);
                 slideShow=1;
                 setSlide(this, "slide-running");
                 timeoutHandle = setTimeout(function() {
                     nextImage();
                 }, delay);
	     } 
             else if (slideShow == 1) {
                 slideShow=0;
                 setSlide(this, "slide-paused");
                 if (timeoutHandle) clearTimeout(timeoutHandle);
	     } 
	 } 
         event.preventDefault();
         event.stopPropagation();
    }, false);
    document.querySelector("#button-option").addEventListener("click", function(event) {
         let app = document.querySelector("#app")
         if ( app.classList.contains("open")) {
              app.classList.remove("open");
         } else {
              app.classList.add("open");
         } 
         event.preventDefault();
         event.stopPropagation();
    }, false);
    document.querySelector("#button-fullscreen").addEventListener("click", function(event) {
         let app = document.querySelector("#app")
         if ( app.classList.contains("fullscreen")) {
              app.classList.remove("fullscreen");
              this.innerHTML = "Fullscreen";
         } else {
              app.classList.add("fullscreen");
              this.innerHTML = "Restore screen";
         } 
         toggleFullscreen(app);
         event.preventDefault();
         event.stopPropagation();
    }, false);
    document.querySelector("#button-loadlist").addEventListener("click", function(event) {
         this.classList.add("loading-list");
         loadList();
         event.preventDefault();
         event.stopPropagation();
    }, false);
    document.querySelector("#button-slide-index-random").addEventListener("click", function(event) {
        let element = document.querySelector("#slide-index");
        if (listLength>1) {
            element.value = randomIndex();
            let event = new Event('change');
            element.dispatchEvent(event);
        }
        event.preventDefault();
        event.stopPropagation();
    }, false);
    document.querySelector("#slide-index").addEventListener("change", function(event) {
        index = parseInt(document.querySelector("#slide-index").value) -1;
        updateImage();
        updateStatus();
        event.preventDefault();
        event.stopPropagation();
    }, false);
    document.querySelector("#button-logout").addEventListener("click", function(event) {
         logout();
         event.preventDefault();
         event.stopPropagation();
    }, false);
}

function loadList() {
    setSlide(document.querySelector("#button-pause"), "slide-loading");
    fetch('/api/loadlist')
      .then(response => response.json())
      .then(data => {
          console.log(data)
          listLength = data.listLength;
          document.querySelector("#slide-index").max = listLength;
          document.querySelector("#status").innerHTML = "list loaded";
          document.querySelector("#button-loadlist").classList.remove("loading-list");
          console.log("list loaded");
          updateImage();
          updateStatus();
          slideShow=0; // default to NOT sliding
          setSlide(document.querySelector("#button-pause"), "slide-running");
    });
}

function updateImage() {
     let element = document.querySelector("#display-image");
     element.removeAttribute("width");
     element.removeAttribute("height");
     element.onload = imageToFull;
     element.src = "/images/image?index=" + index + "&cb=" + usageIndex + Math.random().toString();
     usageIndex++;
}

function imageToFull() {
//    console.log("image has loaded " + this.width + "x" + this.width);
    let el = this;
    if (window.innerWidth > window.innerHeight-4) {
//        console.log("wiW > wiH");
        el.height = window.innerHeight-4;
    } else {
//        console.log("wiW <= wiH");
        if (el.width >= el.height) {
//            console.log("eW >= eH");
            el.width = window.innerWidth;
        } else {
//            console.log("eW < eH");
            el.height = window.innerHeight-4;
        }
    }
    let appElement = document.querySelector("#app");
    appElement.style.height = window.innerHeight + "px";
    if(slideShow == 1) {
        timeoutHandle = setTimeout(function() {
            nextImage();
        }, delay);
    }
}

function displayElements() {
    var elements = document.querySelectorAll(".button-control");
    for (let i=0;i<elements.length;i++) {
        elements[i].setAttribute("style","font-size:"+elements[i].clientWidth+"px")
    }
}

function updateStatus() {
    setTimeout(() => { 
        let status = getInteralIndex(index) + "/" + listLength + " " + decodeURIComponent(document.cookie.match(/([^=]+)=(.+)/)[2]) + " ";
        var element = document.querySelector("#status");
        element.innerHTML = status;
        element.scrollLeft = element.scrollWidth;
        
    },300); // how? why? ... this works :p
}

// rolls over if exceeds length
function getInteralIndex(index) {
    index++;
    let reindex = index;
    let len = listLength;
    if (index > len) {
       let mod = Math.ceil(index / len);
       let rem = 0;// index % len;
       let m = 0;
       if (mod > 1) { m = 1 };
       let X = (len * (mod - m) + rem);
       reindex = reindex - X;
    }
    //reindex--;
    return reindex;
}
function nextImage() {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    index++;
    updateImage();
    updateStatus();
}
function inhibitTouch(e){
    let element = document.querySelector("#touch-inhibitor");
    element.innerHTML = new Date().getTime().toString();
    if(e.changedTouches && e.changedTouches.length>0) {
        let clientX = e.changedTouches[0].clientX;
        let clientY = e.changedTouches[0].clientY;
        element.style.left = clientX + "px";
        element.style.top = clientY + "px";
        element.innerHTML = clientY + "px " +clientY + "px";
    }
}
function toggleVisibility(el) {
    if (el.classList.contains("pause-visible")) {
        el.classList.remove("pause-visible");
    } else {
        el.classList.add("pause-visible");
    }
}
function setSlide(el, newClass) {
   el.classList.remove("slide-loading");
   el.classList.remove("slide-running");
   el.classList.remove("slide-paused");
   el.classList.add(newClass);
}
// mostly stolen from Mozilla dev docs :)
function toggleFullscreen(elem) {
  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch(err => {
      alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  } else {
    document.exitFullscreen();
  }
}

function randomIndex() {
    let min = 1;
    let max = listLength;
    return Math.floor(min + ( max * Math.random()));
}

function logout() {
    window.location.href="logout";
}
