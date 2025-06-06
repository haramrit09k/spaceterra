(function () {
    const isDevelopment = window.location.hostname === 'localhost';
    const port = 3008;

    window.CONFIG = {
        origin: isDevelopment
            ? `http://localhost:${port}`
            : 'https://spaceterra.herokuapp.com'
    };
})();