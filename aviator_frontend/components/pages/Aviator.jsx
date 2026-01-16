"use client"

import { Socket_Url } from '@/constant/baseUrl';
import { memo, useEffect, useRef, useState } from 'react';


const GAME_STATE = {
  WAITING: "WAITING",
  RUNNING: "RUNNING",
  CRASHED: "CRASHED",
};

const Aviator = () => {
  const [ws, setWs] = useState(null);
  const [activeTab, setActiveTab] = useState("game-history");
  // * Aviator State - 
  const [gameState, setGameState] = useState(GAME_STATE.WAITING);
  const [waitTimer, setWaitTimer] = useState(0);
  const [multiplier, setMultiplier] = useState(0);
  const [aviator_orderId, setAviator_orderId] = useState(null);

  // Bets
  const [currentBets, setCurrentBets] = useState(null);
  const [nextBets, setNextBets] = useState(null);
  const nextBetsRef = useRef(null);


  // * Canvas 
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  const gameStateRef = useRef(GAME_STATE.WAITING);
  const startTimeRef = useRef(null);
  const crashStartTimeRef = useRef(null);
  const prevGameStateRef = useRef(null);
  const startedRef = useRef(false);

  const userBalance = {
    data: {
      amount: {
        numberDecimal: 50000
      }
    }
  };

  setTimeout(() => {
    setGameState(GAME_STATE.RUNNING);
  }, 10000)

  // useEffect(() => {
  //   const webSocketCall = () => {
  //     const newWs = new WebSocket(Socket_Url);
  //     newWs.onopen = () => {
  //       console.log("WebSocket connected");
  //     };

  //     newWs.onclose = () => {
  //       console.log("WebSocket disconnected");
  //       webSocketCall();
  //     };
  //     newWs.onerror = (error) => {
  //       console.error("WebSocket error:", error);
  //       webSocketCall();
  //     };
  //     setWs(newWs);
  //   };
  //   webSocketCall();
  // }, []);

  // useEffect(() => {
  //   if (ws) {
  //     ws.onmessage = (event) => {
  //       try {
  //         const data = JSON.parse(event.data);
  //         // * Aviator Recived Socket Messages
  //         if (data.event === "aviator_sync") {
  //           // console.log("Aviator Sync:", data);
  //           if (data.state === GAME_STATE.WAITING) {
  //             console.log("Game is in WAITING state ASYNC----------------------------------");
  //             if (nextBets) {
  //               setCurrentBets(nextBets);
  //               setNextBets(undefined);
  //             }
  //           };
  //           setGameState(data.state);
  //           setWaitTimer(data.timer);
  //         }
  //         if (data.event === "aviator_orderId") {
  //           setAviator_orderId(data.aviator_orderId);
  //         }
  //         if (data.event === "aviator_state") {
  //           setGameState(data.state);
  //           if (data.state === GAME_STATE.WAITING) {
  //             console.log("Game is in WAITING state ");
  //             const latestNextBets = nextBetsRef.current;
  //             if (latestNextBets) {
  //               console.log("Moving nextBets to currentBets");
  //               setCurrentBets(latestNextBets);
  //               setNextBets(undefined);
  //               nextBetsRef.current = null;
  //             }
  //           }

  //           if (data.state === GAME_STATE.CRASHED) {
  //             setCurrentBets(null);
  //           }
  //         }
  //         if (data.event === "aviator_tick") {
  //           setMultiplier(data.multiplier);
  //         }
  //         if (data.event === "aviator_timer") {
  //           setWaitTimer(data.timer);
  //         }
  //         // * BiD Cancel
  //         if (data.event === "bid_cancel") {
  //           setCurrentBets(null);
  //           setNextBets(null);
  //         }
  //         // For Toast message
  //         if (data.event === "toast") {
  //           if (data.userId === sessionStorage.getItem("userId")) {
  //             toast.success(data.msg);
  //           }
  //         }


  //         if (data.event === "winner") {
  //           const filter = data.data.filter(
  //             (list) => list.id == sessionStorage.getItem("userId")
  //           );
  //           if (filter.length > 0) {
  //             playSound(winSound);
  //             setWinningAmount(filter[0].winningAmount);
  //             setTimeout(() => {
  //               setWinningAmount(0);
  //               refetch();
  //               refetchWithdrawBalance();
  //               setMyrefresh(!myrefresh);
  //             }, 2000);
  //           }
  //         }
  //         if (data.event === "loss") {
  //           const filter = data.data.filter(
  //             (list) => list.id == sessionStorage.getItem("userId")
  //           );
  //           if (filter.length > 0) {
  //             playSound(loseSound);
  //             setLoss(true);
  //             refetchWithdrawBalance();
  //             setTimeout(() => {
  //               setLoss(false);
  //               setMyrefresh(!myrefresh);
  //             }, 2000);
  //           }
  //         }
  //         if (data.event === "update") {
  //           setUpdateTimeDureation(data);
  //         }
  //         if (data.event === "game_history") {
  //           setGameHistory(data.data);
  //         }
  //       } catch (error) {
  //         console.error("❌ Error parsing message:", error);
  //       }
  //     };
  //   }
  // }, [ws]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // add Aviator 
  useEffect(() => {

    if (startedRef.current) return;
    startedRef.current = true;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* ================= SIZE FROM PARENT ================= */
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);



    /* ================= PLANE CONFIG ================= */
    const PLANE_WIDTH = 80;
    const PLANE_HEIGHT = 40;

    // Tail point (curve attaches here)
    const TAIL_OFFSET_X = -32;
    const TAIL_OFFSET_Y = 9;

    const MARGIN_X = width * 0.05;   // 6% horizontal padding
    const MARGIN_Y = height * 0.10;  // 10% bottom padding

    const START_X = 37.45;
    const END_X = width - (MARGIN_X + 80);

    console.log("START_X : ", START_X);
    console.log("END_X : ", END_X);

    const START_Y = height - MARGIN_Y;

    // const START_X = 60;
    // const END_X = width - 120;
    const START_Y_OFFSET = 25; // ⬅️ increase this to move plane up
    const START_X_OFFSET = 0;

    /* ================= IMAGES ================= */
    // const plane = new Image();
    // plane.src = planeGifImg;

    const planeImg = new Image();
    planeImg.src = "/img/middle_part.png";

    const topImg = new Image();
    topImg.src = "/img/top_part.png";

    const downImg = new Image();
    downImg.src = "/img/down_part.png";

    const rayImg = new Image();
    rayImg.src = "/img/r-ray.png";

    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded === 4) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    // plane.onload = onLoad;
    planeImg.onload = onLoad;
    topImg.onload = onLoad;
    downImg.onload = onLoad;
    rayImg.onload = onLoad;

    /* ================= TIMINGS ================= */
    const startingDuration = 3000;
    const takeoffDuration = 8000;

    let rayRotation = 0;
    const rayRotationSpeed = 0.003;

    /* ================= FLIGHT PATH ================= */
    function getPosition(t) {

      const p = Math.min(t / takeoffDuration, 1);
      const x =
        START_X + START_X_OFFSET +
        p * (END_X - START_X - START_X_OFFSET);

      const y =
        height -
        START_Y_OFFSET -
        Math.pow(p, 1.8) * (height * 0.75);

      console.log("position - x ", x);
      console.log("position - y ", y);

      // Stop exactly at takeoff end
      if (t <= takeoffDuration) {
        return { x, y };
      }


      // ---- PERFECT SMOOTH HOVER TRANSITION ----
      // ---- REAL AVIATOR SMOOTH HOVER (MOBILE SAFE) ----
      const hover = t - takeoffDuration;

      // Last takeoff position
      const endX = START_X + START_X_OFFSET + (END_X - START_X);
      const endY = height - START_Y_OFFSET - height * 0.75;

      // Ease-in (first 1s)
      const ease = Math.min(hover / 1000, 1);
      const easeOut = 1 - Math.pow(1 - ease, 3);

      // 🔹 Responsive hover amplitudes (important for mobile)
      const hoverAmplitudeX = width * 0.08;   // 5% of width
      const hoverAmplitudeY = height * 0.035; // 3.5% of height

      // Frequencies + phase (natural drift)
      const offsetX =
        Math.sin(hover * 0.0012) * hoverAmplitudeX * easeOut;

      const offsetY =
        Math.sin(hover * 0.0017 + Math.PI / 3) *
        hoverAmplitudeY *
        easeOut;

      // 🔹 Safe vertical limits (extra padding on top for mobile)
      const topLimit = height * 0.14;
      const bottomLimit = height * 0.9;

      // Soft clamp (prevents snapping)
      const softClamp = (value, min, max) => {
        if (value < min) return min + (value - min) * 0.3;
        if (value > max) return max + (value - max) * 0.3;
        return value;
      };

      return {
        x: softClamp(endX + offsetX, START_X, END_X),
        y: softClamp(endY + offsetY, topLimit, bottomLimit)
      };

    }

    /* ================= MAIN LOOP ================= */
    function animate(timestamp) {
      ctx.clearRect(0, 0, width, height);

      if (!gameStateRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // 🔁 State transitions
      if (prevGameStateRef.current !== gameStateRef.current) {
        if (gameStateRef.current === GAME_STATE.RUNNING) {
          startTimeRef.current = timestamp;
        }

        if (gameStateRef.current === GAME_STATE.CRASHED) {
          crashStartTimeRef.current = timestamp;
        }

        if (gameStateRef.current === GAME_STATE.WAITING) {
          startTimeRef.current = null;
          crashStartTimeRef.current = null;
        }

        prevGameStateRef.current = gameStateRef.current;
      }



      /* ===== ROTATING RAY BACKGROUND ===== */
      rayRotation += rayRotationSpeed;

      const rayW = width * 1.6;
      const rayH = height * 1.6;
      const rayX = -width * 0.8;
      const rayY = height - rayH * 0.2;

      ctx.save();
      ctx.globalAlpha = 0.5;
      // ctx.translate(rayX + rayW / 2, rayY + rayH / 2);
      // ctx.rotate(rayRotation);
      // ctx.drawImage(rayImg, -rayW / 2, -rayH / 2, rayW, rayH);
      ctx.restore();

      /* ================= WAITING ================= */
      if (gameStateRef.current === GAME_STATE.WAITING) {
        const p = getPosition(0);

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.drawImage(
          planeImg,
          -PLANE_WIDTH / 2,
          -PLANE_HEIGHT / 2,
          PLANE_WIDTH,
          PLANE_HEIGHT
        );

        // Nose of the plane
        const NOSE_X = PLANE_WIDTH / 2; // tweak to attach propeller
        const NOSE_Y = 0; // center vertical
        ctx.save();
        ctx.translate(NOSE_X, NOSE_Y);

        // Natural sizes
        const topW = topImg.naturalWidth || 28;
        const topH = topImg.naturalHeight || 28;
        const downW = downImg.naturalWidth || 28;
        const downH = downImg.naturalHeight || 28;


        const topOFFSET = 27; // vertical separation
        const bottomOFFSET = 8

        // Pulse animation 2 propeller
        const pulse = Math.sin(performance.now() * 0.020); // -1 → 1

        ctx.scale(1, 1 + pulse * 0.06);

        // Top propeller (slightly up)

        ctx.drawImage(
          topImg,
          -topW / 2 - 5,
          -topH / 2 - topOFFSET, // shift slightly upward
          topW,
          topH
        );

        ctx.scale(1, 1 + pulse * 0.06);
        // Bottom propeller (slightly down)
        ctx.drawImage(
          downImg,
          -downW / 2,
          -downH / 2 + bottomOFFSET, // shift slightly downward
          downW,
          downH
        );

        ctx.restore();
        ctx.restore();

        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      /* ================= CRASHED ================= */
      if (gameStateRef.current === GAME_STATE.CRASHED) {
        const t = timestamp - crashStartTimeRef.current;
        const x = END_X + t * 0.6;
        const y = height * 0.25 - t * 0.4;

        ctx.save();
        ctx.translate(x, y);
        // ctx.rotate(-Math.PI / 6);
        ctx.drawImage(
          planeImg,
          -PLANE_WIDTH / 2,
          -PLANE_HEIGHT / 2,
          PLANE_WIDTH,
          PLANE_HEIGHT
        );

        // Nose of the plane
        const NOSE_X = PLANE_WIDTH / 2; // tweak to attach propeller
        const NOSE_Y = 0; // center vertical
        ctx.save();
        ctx.translate(NOSE_X, NOSE_Y);

        // Natural sizes
        const topW = topImg.naturalWidth || 28;
        const topH = topImg.naturalHeight || 28;
        const downW = downImg.naturalWidth || 28;
        const downH = downImg.naturalHeight || 28;


        const topOFFSET = 27; // vertical separation
        const bottomOFFSET = 8

        // Pulse animation 2 propeller
        const pulse = Math.sin(performance.now() * 0.020); // -1 → 1

        ctx.scale(1, 1 + pulse * 0.06);

        // Top propeller (slightly up)

        ctx.drawImage(
          topImg,
          -topW / 2 - 5,
          -topH / 2 - topOFFSET, // shift slightly upward
          topW,
          topH
        );

        ctx.scale(1, 1 + pulse * 0.06);
        // Bottom propeller (slightly down)
        ctx.drawImage(
          downImg,
          -downW / 2,
          -downH / 2 + bottomOFFSET, // shift slightly downward
          downW,
          downH
        );

        ctx.restore();
        ctx.restore();

        // if (x < width + 200 && y > -200) {
        //   animationRef.current = requestAnimationFrame(animate);
        // }
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      /* ================= RUNNING ================= */
      const elapsed = timestamp - startTimeRef.current;
      const p1 = getPosition(elapsed);
      const p2 = getPosition(elapsed + 16);
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      /* 🔴 RED FILL (TAIL ATTACHED) */
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(p1.x + TAIL_OFFSET_X, p1.y + TAIL_OFFSET_Y);
      ctx.lineTo(p1.x + TAIL_OFFSET_X, height);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,0,0,0.35)";
      ctx.fill();

      /* 📈 CURVE */
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(p1.x + TAIL_OFFSET_X, p1.y + TAIL_OFFSET_Y);
      ctx.strokeStyle = "#ff2e2e";
      ctx.lineWidth = 2;
      ctx.stroke();

      /* ✈️ PLANE */
      ctx.save();
      ctx.translate(p1.x, p1.y);
      // ctx.rotate(angle);
      ctx.drawImage(
        planeImg,
        -PLANE_WIDTH / 2,
        -PLANE_HEIGHT / 2,
        PLANE_WIDTH,
        PLANE_HEIGHT
      );

      // Nose of the plane
      const NOSE_X = PLANE_WIDTH / 2; // tweak to attach propeller
      const NOSE_Y = 0; // center vertical
      ctx.save();
      ctx.translate(NOSE_X, NOSE_Y);

      // Natural sizes
      const topW = topImg.naturalWidth || 28;
      const topH = topImg.naturalHeight || 28;
      const downW = downImg.naturalWidth || 28;
      const downH = downImg.naturalHeight || 28;


      const topOFFSET = 27; // vertical separation
      const bottomOFFSET = 8

      // Pulse animation 2 propeller
      const pulse = Math.sin(performance.now() * 0.013); // -1 → 1

      ctx.scale(1, 1 + pulse * 0.06);

      // Top propeller (slightly up)

      ctx.drawImage(
        topImg,
        -topW / 2 - 5,
        -topH / 2 - topOFFSET, // shift slightly upward
        topW,
        topH
      );

      ctx.scale(1, 1 + pulse * 0.06);
      // Bottom propeller (slightly down)
      ctx.drawImage(
        downImg,
        -downW / 2,
        -downH / 2 + bottomOFFSET, // shift slightly downward
        downW,
        downH
      );

      ctx.restore();
      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    }

    // return () => cancelAnimationFrame(animationRef.current);
    return () => {
      startedRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }, []);


  /* ================= CRASH BUTTON ================= */
  const crashPlane = () => {
    gameStateRef.current = GAME_STATE.CRASHED;
  };

  const sendWSMessage = (data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      console.warn("⚠️ WebSocket not connected");
    }
  }

  const handleBid = (amount) => {
    if (gameState === GAME_STATE.WAITING && (!currentBets && !nextBets)) {
      console.log("Bid Placed");
      console.log(Number(userBalance?.data?.amount?.$numberDecimal))
      if (Number(userBalance?.data?.amount?.$numberDecimal) >= amount) {
        const data = {
          event: "aviator_bet_placed",
          amount: amount,
          orderId: aviator_orderId,
          gameType: "aviator",
          userId: sessionStorage.getItem("userId"),
          gameState: gameState,
          imaginaryAmount: amount
        };
        setCurrentBets(data);
        sendWSMessage(data);
        return;
      } else {
        alert("Insufficient balance");
        return;
      }
    } else if (gameState === GAME_STATE.RUNNING && currentBets) {
      console.log("Cashout Requested at multiplier:", multiplier);
      const data = {
        event: "aviator_cashout",
        amount: amount,
        multiplier: multiplier,
        orderId: aviator_orderId,
        gameType: "aviator",
        userId: sessionStorage.getItem("userId"),
        gameState: gameState,
      };
      sendWSMessage(data);
      currentBets && setCurrentBets(null);
      return;

    } else if (gameState !== GAME_STATE.WAITING && (!currentBets && !nextBets)) {
      if (Number(userBalance?.data?.amount?.$numberDecimal) >= amount) {
        const data = {
          event: "aviator_bet_placed",
          amount: amount,
          orderId: "",
          gameType: "aviator",
          userId: sessionStorage.getItem("userId"),
          gameState: gameState,
          imaginaryAmount: amount
        };
        setNextBets(data);
        nextBetsRef.current = data
        sendWSMessage(data);
        return;
      } else {
        alert("Insufficient balance");
        return;
      }
    } else if (gameState !== GAME_STATE.RUNNING && (currentBets)) {
      const data = {
        event: "aviator_bet_cancel",
        amount: amount,
        orderId: aviator_orderId,
        gameType: "aviator",
        userId: sessionStorage.getItem("userId"),
        gameState: gameState,
        imaginaryAmount: amount
      };
      sendWSMessage(data);
      return;
    } else if (gameState !== GAME_STATE.WAITING && nextBets) {
      const data = {
        event: "aviator_bet_cancel",
        amount: amount,
        orderId: aviator_orderId,
        gameType: "aviator",
        userId: sessionStorage.getItem("userId"),
        gameState: gameState,
        imaginaryAmount: amount
      };
      sendWSMessage(data);
      return;
    }

  }


  console.log("state -- ", gameState);
  return (
    <main className="min-h-screen bg-gray-100 p-2 sm:p-4">
      <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center sm:text-left">
        Aviator
      </h1>

      <div className="border border-black rounded-lg bg-white overflow-hidden">

        {/* Header */}
        <div className="border-b p-3 font-semibold text-center sm:text-left">
          Aviator Header
        </div>

        {/* Content */}
        <div className="flex flex-col sm:flex-row h-[600px] sm:h-[500px]">

          {/* Game Area */}
          <div className="w-full sm:w-[70%] flex flex-col order-1">

            {/* Canvas Area */}
            <div className="flex-1 bg-black">
              <canvas
                ref={canvasRef}
                className="w-full h-full block"
              />
            </div>

            {/* Controls */}
            <div className="border-t p-3 sm:p-4 flex justify-center">
              <button
                className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 sm:py-2 rounded-lg font-bold
                       hover:bg-green-700 transition"
              >
                BID
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-full sm:w-[30%] border-t sm:border-t-0 sm:border-l p-3 order-2">
            <h2 className="font-semibold mb-2 text-center sm:text-left">
              Results
            </h2>

            <div className="grid grid-cols-3 sm:grid-cols-1 gap-2">
              <div className="bg-gray-200 p-2 rounded text-center">1.25x</div>
              <div className="bg-gray-200 p-2 rounded text-center">2.10x</div>
              <div className="bg-gray-200 p-2 rounded text-center">3.50x</div>
            </div>
          </div>

        </div>
      </div>
    </main>


  );
};

export default memo(Aviator);