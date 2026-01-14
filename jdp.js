(function() {
    const old = document.getElementById('m-oth-c');
    if (old) old.remove();

    const container = document.createElement('div');
    container.id = 'm-oth-c';
    Object.assign(container.style, {
        position: 'fixed', top: '10px', right: '10px', zIndex: '10001',
        backgroundColor: '#1a1a1a', color: '#eee', padding: '12px',
        borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        width: '320px', fontFamily: 'sans-serif'
    });

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="font-weight:bold;color:#4caf50;font-size:14px;">OTHELLO CORE</span>
            <span id="close-oth" style="cursor:pointer;padding:0 5px;">✕</span>
        </div>
        <div id="score" style="text-align:center;font-size:16px;margin-bottom:8px;font-weight:bold;"></div>
        <canvas id="board" style="width:296px;height:296px;background:#006400;display:block;margin:0 auto;border-radius:2px;"></canvas>
        <div id="status" style="text-align:center;font-size:11px;margin:8px 0;color:#888;"></div>
        <div style="display:flex;gap:6px;">
            <select id="botStrength" style="flex:2;background:#333;color:#fff;border:1px solid #444;border-radius:4px;padding:4px;font-size:12px;">
                <option value="2">Level 2</option>
                <option value="4" selected>Level 4</option>
                <option value="6">Level 6</option>
            </select>
            <button id="reset-oth" style="flex:1;background:#4caf50;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">RESET</button>
        </div>
    `;
    document.body.appendChild(container);

    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 600;

    const BOARD_SIZE = 8;
    const CELL_SIZE = canvas.width / BOARD_SIZE;
    const EMPTY = 0, BLACK = 1, WHITE = 2;
    let board = [], currentPlayer = BLACK, passCount = 0;

    const botStrengthSelect = document.getElementById('botStrength');
    const statusDiv = document.getElementById('status');
    const scoreDiv = document.getElementById('score');
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    let audioContextResumed = false;

    function resumeAudioContext() {
        if (audioContext.state === 'suspended' && !audioContextResumed) {
            audioContext.resume().then(() => { audioContextResumed = true; });
        }
    }

    function playSound(freq = 880, dur = 0.05, type = 'square', vol = 0.3) {
        if (!audioContextResumed) return;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.001);
        gain.gain.linearRampToValueAtTime(0, now + dur);
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.start(now);
        osc.stop(now + dur);
    }

    function initBoard() {
        board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
        board[3][3] = WHITE; board[3][4] = BLACK;
        board[4][3] = BLACK; board[4][4] = WHITE;
        passCount = 0;
    }

    function inBoard(x, y) { return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE; }

    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

    function canPlace(x, y, p, b) {
        if (b[y][x] !== EMPTY) return false;
        const opp = p === BLACK ? WHITE : BLACK;
        for (let [dx, dy] of directions) {
            let nx = x + dx, ny = y + dy, hasOpp = false;
            while (inBoard(nx, ny) && b[ny][nx] === opp) { nx += dx; ny += dy; hasOpp = true; }
            if (hasOpp && inBoard(nx, ny) && b[ny][nx] === p) return true;
        }
        return false;
    }

    function getValidMoves(p, b) {
        let m = [];
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (canPlace(x, y, p, b)) m.push({x, y});
            }
        }
        return m;
    }

    function placeStone(x, y, p, b, ex = false) {
        if (ex) b[y][x] = p;
        const opp = p === BLACK ? WHITE : BLACK;
        const flips = [];
        for (let [dx, dy] of directions) {
            let nx = x + dx, ny = y + dy, temp = [];
            while (inBoard(nx, ny) && b[ny][nx] === opp) { temp.push({x: nx, y: ny}); nx += dx; ny += dy; }
            if (temp.length > 0 && inBoard(nx, ny) && b[ny][nx] === p) {
                flips.push(...temp);
                if (ex) { for (let pos of temp) b[pos.y][pos.x] = p; }
            }
        }
        return flips;
    }

    function evaluateBoard(b) {
        const W = [
            [100,-20,10,5,5,10,-20,100],[-20,-50,-2,-2,-2,-2,-50,-20],
            [10,-2,1,1,1,1,-2,10],[5,-2,1,1,1,1,-2,5],[5,-2,1,1,1,1,-2,5],
            [10,-2,1,1,1,1,-2,10],[-20,-50,-2,-2,-2,-2,-50,-20],[100,-20,10,5,5,10,-20,100]
        ];
        let s = 0, bc = 0, wc = 0;
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                if (b[y][x] === BLACK) { s -= W[y][x]; bc++; }
                else if (b[y][x] === WHITE) { s += W[y][x]; wc++; }
            }
        }
        return s + (wc - bc);
    }

    function minimax(b, d, md, p, alpha, beta) {
        const opp = p === BLACK ? WHITE : BLACK;
        const vm = getValidMoves(p, b);
        const ovm = getValidMoves(opp, b);
        if (d === md || (vm.length === 0 && ovm.length === 0)) return { score: evaluateBoard(b) };
        if (vm.length === 0) return minimax(b, d, md, opp, alpha, beta);
        if (p === WHITE) {
            let maxE = -Infinity, bestM = null;
            for (let m of vm) {
                let nb = b.map(r => r.slice());
                placeStone(m.x, m.y, p, nb, true);
                let res = minimax(nb, d + 1, md, opp, alpha, beta);
                if (res.score > maxE) { maxE = res.score; bestM = m; }
                alpha = Math.max(alpha, res.score);
                if (beta <= alpha) break;
            }
            return { score: maxE, move: bestM };
        } else {
            let minE = Infinity;
            for (let m of vm) {
                let nb = b.map(r => r.slice());
                placeStone(m.x, m.y, p, nb, true);
                let res = minimax(nb, d + 1, md, opp, alpha, beta);
                minE = Math.min(minE, res.score);
                beta = Math.min(beta, res.score);
                if (beta <= alpha) break;
            }
            return { score: minE };
        }
    }

    function drawBoard(hf = []) {
        ctx.fillStyle = '#006400';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= BOARD_SIZE; i++) {
            ctx.beginPath(); ctx.moveTo(0, i * CELL_SIZE); ctx.lineTo(canvas.width, i * CELL_SIZE); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(i * CELL_SIZE, 0); ctx.lineTo(i * CELL_SIZE, canvas.height); ctx.stroke();
        }
        const vm = getValidMoves(BLACK, board);
        for (let y = 0; y < BOARD_SIZE; y++) {
            for (let x = 0; x < BOARD_SIZE; x++) {
                const s = board[y][x];
                const isF = hf.some(p => p.x === x && p.y === y);
                if (s === EMPTY) {
                    if (currentPlayer === BLACK && vm.some(m => m.x === x && m.y === y)) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                        ctx.beginPath(); ctx.arc(x*CELL_SIZE+CELL_SIZE/2, y*CELL_SIZE+CELL_SIZE/2, 4, 0, Math.PI*2); ctx.fill();
                    }
                    continue;
                }
                ctx.beginPath();
                ctx.arc(x*CELL_SIZE+CELL_SIZE/2, y*CELL_SIZE+CELL_SIZE/2, CELL_SIZE/2-6, 0, Math.PI*2);
                ctx.fillStyle = s === BLACK ? '#111' : '#eee';
                ctx.fill();
                if (isF) { ctx.strokeStyle = '#4caf50'; ctx.lineWidth = 4; ctx.stroke(); }
            }
        }
        const bc = board.flat().filter(x => x === BLACK).length;
        const wc = board.flat().filter(x => x === WHITE).length;
        scoreDiv.textContent = `B ${bc} - ${wc} W`;
    }

    function animateFlips(x, y, p, f) {
        board[y][x] = p;
        drawBoard(f);
        playSound(p === BLACK ? 800 : 600);
        let idx = 0;
        function next() {
            if (idx < f.length) {
                const pos = f[idx];
                board[pos.y][pos.x] = p;
                playSound(1000 + idx * 50, 0.08);
                drawBoard(f.slice(idx + 1));
                idx++;
                setTimeout(next, 80);
            } else {
                currentPlayer = p === BLACK ? WHITE : BLACK;
                update();
                if (currentPlayer === WHITE) setTimeout(bot, 400);
            }
        }
        setTimeout(next, 80);
    }

    function update() {
        const pm = getValidMoves(BLACK, board);
        const bm = getValidMoves(WHITE, board);
        const bc = board.flat().filter(x => x === BLACK).length;
        const wc = board.flat().filter(x => x === WHITE).length;

        if ((pm.length === 0 && bm.length === 0) || (bc + wc === 64)) {
            statusDiv.textContent = bc > wc ? 'YOU WIN' : bc < wc ? 'BOT WIN' : 'DRAW';
            playSound(bc > wc ? 500 : 200, 0.5, 'triangle', 0.5);
            return;
        }

        if (currentPlayer === BLACK) {
            if (pm.length === 0) { currentPlayer = WHITE; statusDiv.textContent = 'PASS'; setTimeout(bot, 600); }
            else { statusDiv.textContent = 'YOUR TURN'; }
        } else {
            if (bm.length === 0) { currentPlayer = BLACK; statusDiv.textContent = 'BOT PASS'; }
            else { statusDiv.textContent = 'BOT THINKING...'; }
        }
        drawBoard();
    }

    function bot() {
        const d = parseInt(botStrengthSelect.value, 10);
        const res = minimax(board, 0, d, WHITE, -Infinity, Infinity);
        if (res.move) animateFlips(res.move.x, res.move.y, WHITE, placeStone(res.move.x, res.move.y, WHITE, board, false));
        else update();
    }

    canvas.onclick = (e) => {
        resumeAudioContext();
        if (currentPlayer !== BLACK) return;
        const r = canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - r.left) / (r.width / 8));
        const y = Math.floor((e.clientY - r.top) / (r.height / 8));
        const f = placeStone(x, y, BLACK, board, false);
        if (canPlace(x, y, BLACK, board) && f.length > 0) animateFlips(x, y, BLACK, f);
    };

    document.getElementById('reset-oth').onclick = () => { resumeAudioContext(); initBoard(); update(); };
    document.getElementById('close-oth').onclick = () => container.remove();

    initBoard();
    update();
})();