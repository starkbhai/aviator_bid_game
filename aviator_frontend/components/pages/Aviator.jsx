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
  const [gameState, setGameState] = useState(null);
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

    const userBalance={
        data:{
            amount:{
                numberDecimal:50000
            }
        }
    };

  useEffect(() => {
    const webSocketCall = () => {
      const newWs = new WebSocket(Socket_Url);
      newWs.onopen = () => {
        console.log("WebSocket connected");
      };

      newWs.onclose = () => {
        console.log("WebSocket disconnected");
        webSocketCall();
      };
      newWs.onerror = (error) => {
        console.error("WebSocket error:", error);
        webSocketCall();
      };
      setWs(newWs);
    };
    webSocketCall();
  }, []);

  useEffect(() => {
    if (ws) {
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // * Aviator Recived Socket Messages
          if(data.event === "aviator_sync") {
            // console.log("Aviator Sync:", data);
            if(data.state === GAME_STATE.WAITING) {
                console.log("Game is in WAITING state ASYNC----------------------------------");
                  if(nextBets){
                     setCurrentBets(nextBets);
                     setNextBets(undefined);
                  }
            };
            setGameState(data.state);
            setWaitTimer(data.timer);
          }
          if(data.event === "aviator_orderId") {
            setAviator_orderId(data.aviator_orderId);
          }
          if(data.event === "aviator_state") {
              setGameState(data.state);
              if(data.state === GAME_STATE.WAITING) {
                console.log("Game is in WAITING state ");
                  const latestNextBets = nextBetsRef.current;
                  if(latestNextBets){
                    console.log("Moving nextBets to currentBets");
                     setCurrentBets(latestNextBets);
                     setNextBets(undefined);
                     nextBetsRef.current = null;
                  }
              }

              if(data.state === GAME_STATE.CRASHED) {
                  setCurrentBets(null);
              }
          }
          if(data.event === "aviator_tick") {
            setMultiplier(data.multiplier);
           }
          if(data.event === "aviator_timer") {
            setWaitTimer(data.timer);
          }
          // * BiD Cancel
          if(data.event === "bid_cancel"){
             setCurrentBets(null);
             setNextBets(null);
          }
          // For Toast message
          if(data.event === "toast"){
            if(data.userId === sessionStorage.getItem("userId")){
                toast.success(data.msg);
            }
          }


          if (data.event === "winner") {
            const filter = data.data.filter(
              (list) => list.id == sessionStorage.getItem("userId")
            );
            if (filter.length > 0) {
              playSound(winSound);
              setWinningAmount(filter[0].winningAmount);
              setTimeout(() => {
                setWinningAmount(0);
                refetch();
                refetchWithdrawBalance();
                setMyrefresh(!myrefresh);
              }, 2000);
            }
          }
          if (data.event === "loss") {
            const filter = data.data.filter(
              (list) => list.id == sessionStorage.getItem("userId")
            );
            if (filter.length > 0) {
              playSound(loseSound);
              setLoss(true);
              refetchWithdrawBalance();
              setTimeout(() => {
                setLoss(false);
                setMyrefresh(!myrefresh);
              }, 2000);
            }
          }
          if (data.event === "update") {
            setUpdateTimeDureation(data);
          }
          if (data.event === "game_history") {
            setGameHistory(data.data);
          }
        } catch (error) {
          console.error("❌ Error parsing message:", error);
        }
      };
    }
  }, [ws]);
  
  useEffect(() => {
      gameStateRef.current = gameState;
  }, [gameState]);

    // add Aviator 
  useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      /* ================= SIZE FROM PARENT ================= */
      const parent = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
      const height = parent.clientHeight / 1.5;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* ================= PLANE CONFIG ================= */
      const PLANE_WIDTH = 80;
      const PLANE_HEIGHT = 40;

      // Tail point (curve attaches here)
      const TAIL_OFFSET_X = -32;
      const TAIL_OFFSET_Y = 9;

      const START_X = 60;
      const END_X = width - 120;
      const START_Y_OFFSET = 25; // ⬅️ increase this to move plane up
      const START_X_OFFSET = -5; 

      /* ================= IMAGES ================= */
      const plane = new Image();
      plane.src = "/img/aviator.png";

      const rayImg = new Image();
      rayImg.src = "/img/r-ray.png";

      let loaded = 0;
      const onLoad = () => {
        loaded++;
        if (loaded === 2) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      plane.onload = onLoad;
      rayImg.onload = onLoad;

      /* ================= TIMINGS ================= */
      const startingDuration = 3000;
      const takeoffDuration = 8000;

      let rayRotation = 0;
      const rayRotationSpeed = 0.003;

      /* ================= FLIGHT PATH ================= */
      function getPosition(t) {
        if (t <= takeoffDuration) {
          const p = t / takeoffDuration;
          return {
            x: START_X + START_X_OFFSET + p * (END_X - START_X),
            y: height - START_Y_OFFSET - Math.pow(p, 1.8) * (height * 0.75)
          };
        }

        // Hover animation (after reach end)
        const hover = t - takeoffDuration;
        return {
          x: END_X + Math.sin(hover * 0.0012) * 20,
          y: height * 0.25 + Math.sin(hover * 0.0018) * 15
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
        ctx.translate(rayX + rayW / 2, rayY + rayH / 2);
        ctx.rotate(rayRotation);
        ctx.drawImage(rayImg, -rayW / 2, -rayH / 2, rayW, rayH);
        ctx.restore();

        /* ================= WAITING ================= */
        if (gameStateRef.current === GAME_STATE.WAITING) {
          const p = getPosition(0);

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.drawImage(
            plane,
            -PLANE_WIDTH / 2,
            -PLANE_HEIGHT / 2,
            PLANE_WIDTH,
            PLANE_HEIGHT
          );
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
          ctx.rotate(-Math.PI / 4);
          ctx.drawImage(
            plane,
            -PLANE_WIDTH / 2,
            -PLANE_HEIGHT / 2,
            PLANE_WIDTH,
            PLANE_HEIGHT
          );
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
          plane,
          -PLANE_WIDTH / 2,
          -PLANE_HEIGHT / 2,
          PLANE_WIDTH,
          PLANE_HEIGHT
        );
        ctx.restore();

        animationRef.current = requestAnimationFrame(animate);
      }

      return () => cancelAnimationFrame(animationRef.current);
}, []);


  /* ================= CRASH BUTTON ================= */
  const crashPlane = () => {
    gameStateRef.current = GAME_STATE.CRASHED;
  };

  const sendWSMessage=(data)=>{
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      } else {
        console.warn("⚠️ WebSocket not connected");
      }
  }

  const handleBid=(amount)=>{
    if(gameState === GAME_STATE.WAITING && (!currentBets && !nextBets)){
        console.log("Bid Placed");
        console.log(Number(userBalance?.data?.amount?.$numberDecimal))
        if(Number(userBalance?.data?.amount?.$numberDecimal) >= amount) {
          const data = {
              event: "aviator_bet_placed",
              amount : amount,
              orderId : aviator_orderId,
              gameType : "aviator",
              userId: sessionStorage.getItem("userId"),
              gameState : gameState,
              imaginaryAmount:amount
          };
          setCurrentBets(data);
          sendWSMessage(data);
          return;
        }else{
          alert("Insufficient balance");
          return;
        }
    }else if(gameState === GAME_STATE.RUNNING && currentBets ){
        console.log("Cashout Requested at multiplier:", multiplier);
        const data = {
            event: "aviator_cashout",
            amount : amount,
            multiplier : multiplier,
            orderId : aviator_orderId,
            gameType : "aviator",
            userId: sessionStorage.getItem("userId"),
            gameState : gameState,
        };
        sendWSMessage(data);
        currentBets && setCurrentBets(null);
        return;

    }else if(gameState !== GAME_STATE.WAITING && (!currentBets && !nextBets)){
        if(Number(userBalance?.data?.amount?.$numberDecimal) >= amount) {
          const data = {
              event: "aviator_bet_placed",
              amount : amount,
              orderId : "",
              gameType : "aviator",
              userId: sessionStorage.getItem("userId"),
              gameState : gameState,
              imaginaryAmount:amount
          };
          setNextBets(data);
          nextBetsRef.current = data
          sendWSMessage(data);
          return;
        }else{
          alert("Insufficient balance");
          return;
        }
    }else if(gameState !== GAME_STATE.RUNNING && (currentBets)){
      const data = {
              event: "aviator_bet_cancel",
              amount : amount,
              orderId : aviator_orderId,
              gameType : "aviator",
              userId: sessionStorage.getItem("userId"),
              gameState : gameState,
              imaginaryAmount:amount
          };
        sendWSMessage(data);
      return;
     }else if(gameState !== GAME_STATE.WAITING &&  nextBets){
      const data = {
              event: "aviator_bet_cancel",
              amount : amount,
              orderId : aviator_orderId,
              gameType : "aviator",
              userId: sessionStorage.getItem("userId"),
              gameState : gameState,
              imaginaryAmount:amount
          };
        sendWSMessage(data);
      return;
    }

  }
   


  return (
    <main className="main--area">
      
        <div className="register-box">
        {/* <img alt="bhu-vector-2" className="bhu-vector-2 working_img" src="/img/bhu-vector-2.png" /> */}
        {/* <img alt="bhu-vector-1" className="bhu-vector-1 working_img" src="/img/bhu-vector-1.png" /> */}
         
          <div
            className="singUp-wrap dash-in"
            data-background="/img/slider_bg.jpg"
          >
            {/* <DashboardHeader /> */}
            <div className="dash-top fix-body">
              <div className="box-design text-center p-2"> 
                  <h5 className="mb-0">$ {userBalance?.data?.amount?.$numberDecimal} </h5>                   
              </div>
              <div className="win-scroll">
                <div className="x_box">
                  <span> 1.46x </span>
                   <span> 1.46x </span>
                    <span> 1.46x </span>
                     <span> 1.46x </span>
                      <span> 1.46x </span>
                      <span> 1.46x </span>
                      <span> 1.46x </span>
                      <span> 1.46x </span>
                </div>
                <div className="win-go-scroll">
                  <div className="box-design p-0 ">
                    <div className="p-0 min_225   w100 z_index1 position-relative"> 
                      <div className="fun-mode ng-star-inserted">FUN MODE</div>
                        <div className="progress_box">
                        <img src="/assets/img/logo.png" className="in_logo mb-3" />
                        <p>{aviator_orderId ? aviator_orderId : "NO ORDER ID"}</p>
                        {gameState === GAME_STATE.WAITING && waitTimer>0 && <div className="progress2">
                           <div className="color"></div>
                        </div> }
                      </div>
                         {gameState === GAME_STATE.RUNNING && <div className="test_big">{multiplier} <small>X</small></div>}

                       {/* <img src="/assets/img/dashboard/aviator.png" className="aviator_img" /> */}
                        <canvas
                            ref={canvasRef}
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "block",
                              // borderRadius: "10px"
                            }}
                          />
                       {/* <img src="/assets/img/r-ray.png" className="r_ray_img alr" /> */}
                    </div>
                    
                  </div>
                 
                  <div className="dash-game-history">
                    <div className="dash-wallet-color">
                      <nav>
                        <div
                          className="nav nav-tabs mb-3"
                          id="nav-tab"
                          role="tablist"
                        >
                          <button
                            id="nav-home-tab"
                            className={`nav-link ${
                              activeTab === "game-history" ? "active" : ""
                            }`}
                            onClick={() => setActiveTab("game-history")}
                          >
                           Bet
                          </button>
                          <button
                            id="nav-profile-tab"
                            className={`nav-link ${
                              activeTab === "my-history" ? "active" : ""
                            }`}
                            onClick={() => setActiveTab("my-history")}
                          >
                            Auto
                          </button>
                        </div>
                      </nav>
                      <div className="tab-content" id="nav-tabContent">
                        
      <div className="first-row bet-game auto-game-feature d-flex gap-4  justify-content-center mb-3">
  <div className="bet-block w100">
    <div className="spinner ng-untouched ng-valid ng-dirty mb-1"   >
      <div  className="spinner big">
        <div  className="buttons">
          <button
            
            type="button"
            className="minus ng-star-inserted"
          />
          {/**/}
        </div>
        <div  className="input">
          <input
            
            inputMode="decimal"
            type="text"
            tabIndex={-1}
            placeholder={10}
          />
        </div>
        {/**/}
        <div  className="buttons">
          <button
            
            tabIndex={-1}
            type="button"
            className="plus ng-star-inserted"
          />
          {/**/}
        </div>
      </div>
    </div>
    <div className="bets-opt-list">
      <button
       
        className=" btn-secondary btn-sm bet-opt ng-star-inserted"
      >
        <span> 100 </span>
      </button>
      <button
       
        className=" btn-secondary btn-sm bet-opt ng-star-inserted"
      >
        <span> 200 </span>
      </button>
      <button
       
        className=" btn-secondary btn-sm bet-opt ng-star-inserted"
      >
        <span> 500 </span>
      </button>
      <button
       
        className=" btn-secondary btn-sm bet-opt ng-star-inserted"
      >
        <span> 1,000 </span>
      </button>
      {/**/}
    </div>
  </div>
  <div className="buttons-block">
    <button 
      className={`bet ng-star-inserted ${((gameState===GAME_STATE.RUNNING && currentBets) ? "bet_orange":"")} ${(nextBets || (gameState!==GAME_STATE.RUNNING && currentBets)) ? "bet_red" : ""} ${(!currentBets && !nextBets) ? "bet_green":"" }`}
      onClick={()=>handleBid(10)}
    >
      <span 
        className="d-flex flex-column justify-content-center align-items-center"
      >
        <label className="label"> 
          {(gameState === GAME_STATE.RUNNING && currentBets) ? "CASH OUT" : ((gameState !== GAME_STATE.RUNNING && currentBets) || (gameState !== GAME_STATE.WAITING && nextBets)) ? "CANCEL" : "BID" }
        </label>
        <label className="amount">
          <span>{currentBets ? (Number(currentBets.amount) * Number(multiplier)).toFixed(2) : 10.00} </span>
          <span className="currency"> 
             INR
          </span>
          <br/>
          {(gameState !== GAME_STATE.WAITING && nextBets) && <span>Waiting for next round</span>}
          {/* {(gameState === GAME_STATE.RUNNING && currentBets) && <span>CASH OUT</span>} */}
        </label>
      </span>
    </button> 
  </div>
</div>


<div className="second-row d-flex gap-4  justify-content-justify">
 
      <button
      
        className="btn btn-sm btn-primary auto-play-btn ng-star-inserted"
      >
        Auto Play
      </button>
      
 
  <div className="cashout-block ms-auto d-flex bg_light br10  align-items-center p-2">
 
            <div  className="input full-width">
              1.10
            </div>
            <div   className="ms-3"            /> 
           X
          </div> 
 
</div>



                   
                      </div>
                    </div>




 <table className="table text-white">
  <thead>
    <tr>
      <th scope="col">Player</th>
      <th scope="col"> Bet INR </th>
      <th scope="col">X</th>
      <th scope="col"> Win INR </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <span>5</span>
      </td>
      <td>
        <span>5050</span>
      </td>
      <td>
        <span className="text-green">5</span>
      </td>
      <td>
        <span>
         4
        </span>
      </td>
    </tr>
 
 
     
  </tbody>
</table>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    
      </main>
  );
};

export default memo(Aviator);