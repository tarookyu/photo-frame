const Config = {

    data: {},

    async load() {

        const response =
            await fetch("config/config.json");

        this.data = await response.json();

        document.body.style.background =
            this.data.background;

    }

};