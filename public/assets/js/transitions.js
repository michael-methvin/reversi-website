barba.init({
    sync:true,
    transitions:[
        {
        name: 'home',

        // Occurs on Page Exit
        async leave(data) {
            const done = this.async();

            pageTransition();
            await delay(1500);
            done();
        },

        // Occurs on Page Entrance
        async enter(data) {
            contentAnimation();
        },       

        // Occurs only on page load
         async once(data) {
            // TODO: Write animation for index.html page load
            contentAnimation();

        }
        },
        {
            name: 'about',
            // Occurs on Page Exit
            async leave(data) {
                const done = this.async();

                pageTransition();
                await delay(1500);
                done();
            }

        },
        {
            name: 'lobby',
            // Occurs on Page Exit
            async leave(data) {
            const done = this.async();

            pageTransition();
            await delay(1500);
            done();
        }

        },
        {
            name: 'game',
            // Occurs on Page Exit
            async leave(data) {
            const done = this.async();

            pageTransition();
            await delay(1500);
            done();
        }

        }
        
    ]
})


function contentAnimation() {
    var tl = gsap.timeline();

    tl.to('.slide', {clipPath:"polygon(0 0, 100% 0, 100% 100%, 0% 100%)"})
}


function pageTransition() {
    var tl = gsap.timeline();

    tl.to('ul.transition li', { duration:.5, scaleY: 1, transformOrigin: "bottom left", stagger: .2})
    tl.to('ul.transition li', { duration:.5, scaleY: 0, transformOrigin: "bottom left", stagger: .1, delay:.1})

}
function delay(n) {
    n = n || 2000;
    return new Promise(done => {
        setTimeout(() => {
            done();
        }, n);
    });
}

function goToLobby() {
    let username = encodeURI($('#nameInput').val());
    barba.init({
        transitions:[{
            // Occurs on Page Entrance
            async enter(data) {

                const css = document.createElement('link');
                css.setAttribute('rel', 'stylesheet');
                css.setAttribute('href', 'assets/css/lobby_style.css');
                document.head.appendChild(css);


                let js = document.createElement('script');
                js.setAttribute('src','https://ajax.googleapis.com/ajax/libs/jqueryui/1.13.2/jquery-ui.min.js');
                js.setAttribute('integrity','sha384-4D3G3GikQs6hLlLZGdz5wLFzuqE9v4yVGAcOH86y23JqBDPzj9viv0EqyfIa6YUL');
                js.setAttribute('crossorigin','anonymous');
                document.body.appendChild(js); 

                js = document.createElement('script');
                js.setAttribute('src','assets/js/main.js');
                document.body.appendChild(js);
                
                
                const done = this.async();
                pageTransition();
                await delay(1500);
                done();
            }
        }]
    });
    barba.go("lobby.html?username=" + username);
}
/*
barba.hooks.beforeEnter(() => {
    // code to load CSS or JS
    const css = document.createElement('link');
    css.setAttribute('rel', 'stylesheet');
    css.setAttribute('href', 'assets/css/lobby_style.css');
    document.head.appendChild(css);

    const js = document.createElement('script');
    js.setAttribute('src','assets/js/main.js');
    document.body.appendChild(js);
});*/
