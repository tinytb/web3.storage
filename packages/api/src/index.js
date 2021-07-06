import { Router } from 'itty-router'
import { withCorsHeaders, corsOptions } from './cors.js'
import { envAll } from './env.js'
import { carHead, carGet, carPut, carPost } from './car.js'
import { userLoginPost, userTokensPost, userTokensGet, withAuth } from './user.js'
import { JSONResponse } from './utils/json-response.js'

const router = Router()

router.options('*', corsOptions)
router.all('*', envAll)
router.get('/car/:cid', withCorsHeaders(carGet))
router.head('/car/:cid', withCorsHeaders(carHead))
router.put('/car/:cid', withCorsHeaders(withAuth(carPut)))
router.post('/car', withCorsHeaders(withAuth(carPost)))
router.post('/user/login', withCorsHeaders(userLoginPost))
router.get('/user/tokens', withCorsHeaders(withAuth(userTokensGet)))
router.post('/user/tokens', withCorsHeaders(withAuth(userTokensPost)))

router.get('/', () => {
  return new Response(
    `
<body style="font-family: -apple-system, system-ui">
  <h1>📦</h1>
  <p>try
    <a href='/car/bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy'>
      /car/bafkreigh2akiscaildcqabsyg3dfr6chu3fgpregiymsck7e7aqa4s52zy
    </a>
  </p>
</body>`,
    {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=UTF-8',
      },
    }
  )
})

router.all('*', () => new JSONResponse({ message: 'Not Found' }, { status: 404 }))

function serverError (error) {
  console.error(error.stack)
  const message = error.message || 'Server Error'
  const status = error.status || 500
  return new JSONResponse({ message }, { status })
}

addEventListener('fetch', (event) => {
  const respond = () => event.respondWith(router.handle(event.request, {}, event).catch(serverError))
  // when testing just respond to the fake testing domain
  if (typeof process !== 'undefined' && process.env.PW_TEST) {
    const url = new URL(event.request.url)
    if (url.hostname === 'testing.web3.storage') {
      respond()
    }
  } else {
    respond()
  }
})