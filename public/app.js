const $ = (id) => document.getElementById(id)
const tokenKey = 'biblioteca-jogos-token'
const statusLabels = { 'quero-jogar': 'Quero jogar', jogando: 'Jogando', concluido: 'Concluído' }
let token = null
let games = []
let editingId = null
let busy = false

function message(text, type = '') {
    $('message').textContent = text
    $('message').className = `message ${type}`
    $('message').hidden = !text
}

// Bloqueia novos envios enquanto uma operação está em andamento.
async function run(action) {
    if (busy) return
    busy = true
    document.querySelectorAll('button, fieldset').forEach((element) => { element.disabled = true })
    try {
        await action()
    } catch (error) {
        message(error.message, 'error')
    } finally {
        busy = false
        document.querySelectorAll('button, fieldset').forEach((element) => { element.disabled = false })
    }
}

async function request(path, method = 'GET', data, protectedRoute = true) {
    const headers = {}
    if (protectedRoute) headers.Authorization = `Bearer ${token}`
    if (data !== undefined) headers['Content-Type'] = 'application/json'
    let response
    try {
        response = await fetch(path, { method, headers, body: data === undefined ? undefined : JSON.stringify(data) })
    } catch {
        throw new Error('Não foi possível conectar à API. Verifique se o servidor está em execução.')
    }
    if (response.status === 401 && protectedRoute) {
        logout()
        throw new Error('Sua sessão expirou ou é inválida. Entre novamente.')
    }
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.')
    return result
}

function switchAuth(register) {
    $('login-form').reset()
    $('register-form').reset()
    $('login-form').hidden = register
    $('register-form').hidden = !register
    $('login-tab').classList.toggle('active', !register)
    $('register-tab').classList.toggle('active', register)
    $('login-tab').setAttribute('aria-pressed', String(!register))
    $('register-tab').setAttribute('aria-pressed', String(register))
    message('')
}

function resetEditor() {
    editingId = null
    $('game-form').reset()
    $('editor-title').textContent = 'Adicionar jogo'
    $('save-game').textContent = 'Adicionar jogo'
    $('cancel-edit').hidden = true
}

function logout() {
    token = null
    sessionStorage.removeItem(tokenKey)
    games = []
    $('games').replaceChildren()
    $('user-name').textContent = ''
    $('session').hidden = true
    $('library-view').hidden = true
    $('auth-view').hidden = false
    resetEditor()
    switchAuth(false)
}

function showLibrary(user) {
    $('user-name').textContent = user.name
    $('session').hidden = false
    $('auth-view').hidden = true
    $('library-view').hidden = false
    $('login-form').reset()
    $('register-form').reset()
    message('')
}

function renderGames() {
    $('games').replaceChildren()
    $('game-count').textContent = `${games.length} ${games.length === 1 ? 'jogo' : 'jogos'}`
    $('list-state').hidden = games.length > 0
    $('list-state').textContent = 'Sua biblioteca está esperando a primeira aventura. Adicione um jogo para começar.'
    for (const game of games) {
        const card = $('game-template').content.cloneNode(true)
        const badge = card.querySelector('.badge')
        badge.textContent = statusLabels[game.status] || game.status
        if (Object.hasOwn(statusLabels, game.status)) badge.classList.add(game.status)
        card.querySelector('h3').textContent = game.title
        card.querySelector('.platform').textContent = game.platform
        card.querySelector('.rating').textContent = game.rating == null ? 'Sem nota' : `${game.rating} / 10`
        card.querySelector('.edit').addEventListener('click', () => {
            if (busy) return
            editingId = game._id
            for (const field of ['title', 'platform', 'status', 'rating']) {
                $('game-form').elements[field].value = game[field] ?? ''
            }
            $('editor-title').textContent = 'Editar jogo'
            $('save-game').textContent = 'Salvar alterações'
            $('cancel-edit').hidden = false
            message('')
            $('game-title').focus()
            $('game-form').scrollIntoView({ block: 'center' })
        })
        card.querySelector('.delete').addEventListener('click', () => {
            if (busy || !confirm(`Excluir “${game.title}” da sua biblioteca?`)) return
            run(async () => {
                await request(`/games/${encodeURIComponent(game._id)}`, 'DELETE')
                games = games.filter((item) => item._id !== game._id)
                if (editingId === game._id) resetEditor()
                renderGames()
                message('Jogo excluído com sucesso.', 'success')
            })
        })
        $('games').append(card)
    }
}

async function loadGames() {
    $('list-state').hidden = false
    $('list-state').textContent = 'Carregando jogos…'
    try {
        games = await request('/games')
        renderGames()
    } catch (error) {
        $('list-state').textContent = 'Não foi possível atualizar a biblioteca. Use “Atualizar lista” para tentar novamente.'
        throw error
    }
}

// Valida também textos contendo apenas espaços, sem alterar a senha digitada.
function formData(form) {
    const data = Object.fromEntries(new FormData(form))
    for (const [field, value] of Object.entries(data)) {
        if (form.elements[field].required && !value.trim()) {
            throw new Error('Preencha todos os campos obrigatórios.')
        }
        if (field !== 'password') data[field] = value.trim()
    }
    return data
}

$('login-tab').addEventListener('click', () => switchAuth(false))
$('register-tab').addEventListener('click', () => switchAuth(true))
$('logout').addEventListener('click', () => { logout(); message('Você saiu da sua conta.') })
$('cancel-edit').addEventListener('click', resetEditor)
$('reload').addEventListener('click', () => run(async () => { message(''); await loadGames() }))

$('login-form').addEventListener('submit', (event) => {
    event.preventDefault()
    // Lê os campos antes de desabilitar o formulário (FormData ignora campos desabilitados).
    if (busy) return
    let data
    try { data = formData(event.currentTarget) } catch (error) { message(error.message, 'error'); return }
    run(async () => {
        const result = await request('/auth/login', 'POST', data, false)
        sessionStorage.setItem(tokenKey, result.token)
        token = result.token
        showLibrary(result.user)
        await loadGames()
    }).finally(() => { $('login-password').value = '' })
})

$('register-form').addEventListener('submit', (event) => {
    event.preventDefault()
    if (busy) return
    let data
    try { data = formData(event.currentTarget) } catch (error) { message(error.message, 'error'); return }
    run(async () => {
        await request('/auth/register', 'POST', data, false)
        switchAuth(false)
        $('login-email').value = data.email
        message('Conta criada! Entre com seu e-mail e senha.', 'success')
    }).finally(() => {
        $('register-password').value = ''
        $('security-answer').value = ''
    })
})

$('game-form').addEventListener('submit', (event) => {
    event.preventDefault()
    if (busy) return
    let data
    try {
        data = formData(event.currentTarget)
        data.rating = data.rating === '' ? null : Number(data.rating)
        if (data.rating !== null && (!Number.isFinite(data.rating) || data.rating < 0 || data.rating > 10)) {
            throw new Error('A nota deve estar entre 0 e 10.')
        }
    } catch (error) { message(error.message, 'error'); return }
    run(async () => {
        const editing = editingId !== null
        const game = await request(editing ? `/games/${encodeURIComponent(editingId)}` : '/games', editing ? 'PUT' : 'POST', data)
        if (editing) games = games.map((item) => item._id === editingId ? game : item)
        else games.push(game)
        resetEditor()
        renderGames()
        message(editing ? 'Jogo atualizado com sucesso.' : 'Jogo adicionado à biblioteca!', 'success')
    })
})

run(async () => {
    // Apenas o JWT é persistido nesta aplicação acadêmica local.
    token = sessionStorage.getItem(tokenKey)
    if (token) {
        const user = await request('/auth/me')
        showLibrary(user)
        await loadGames()
    }
})
