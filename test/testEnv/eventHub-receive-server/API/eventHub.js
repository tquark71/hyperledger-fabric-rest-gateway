let router = require('./index')

router.post('/ccEvent', (req, res) => {
    let emitter = require('../app').emitter;

    emitter.emit('ccEvent', req.body)
    res.json(req.body)
})

router.post('/blockEvent', (req, res) => {
    let emitter = require('../app').emitter;

    emitter.emit('blockEvent', req.body)
    res.json(req.body)
})