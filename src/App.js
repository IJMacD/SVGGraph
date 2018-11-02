import React, { Component } from 'react';
import './App.css';

const SAVED_INPUT = "saved_input";

class App extends Component {
  constructor (props) {
    super(props);

    const input = localStorage.getItem(SAVED_INPUT) || "10 180 50 60 185 180 280 200 360 80 350 255 200 320 130 240 60 290 10 200";

    this.state = {
      input,
      disabled: ["oldSmooth"],
    };
  }

  changeInput (input) {
    this.setState({ input });
    localStorage.setItem(SAVED_INPUT, input);
  }

  onToggle (toggle, enable) {
    if (enable) {
      const newDisabled = this.state.disabled.filter(d => d !== toggle);
      this.setState({ disabled: newDisabled });
    } else {
      this.setState({ disabled: [...this.state.disabled, toggle]});
    }
  }

  render() {
    const points = parseInput(this.state.input);
    const midPoints = getMidpoints(points);
    const thirdPoints = getThirdpoints(points);
    const bSpline = getBSpline(points);
    const reverse = getReverseBSpline(points);
    const smooth = getBSpline(reverse);
    const old = getBSpline(oldReverseBSpline(points));

    const { disabled } = this.state;

    const toggles = [ "points", "line", "bSpline", "smooth", "oldSmooth", "midPoints", "thirdPoints" ];

    return (
      <div className="App">
        <input value={this.state.input} onChange={e => this.changeInput(e.target.value)} />
        <div>
          {
            toggles.map(toggle => (
              <label>
                <input type="checkbox" checked={!disabled.includes(toggle)} onChange={e => this.onToggle(toggle, e.target.checked)} />
                {toggle}
              </label>
            ))
          }
        </div>
        <svg width={400} height={400}>
          { disabled.includes("line") || <path d={pointsToPolyline(points)} fillOpacity={0} stroke="black" /> }
          { disabled.includes("bSpline") || <path d={controlPointsToBezier(bSpline)} fillOpacity={0} stroke="gray" /> }
          { disabled.includes("smooth") || <path d={controlPointsToBezier(smooth)} fillOpacity={0} stroke="blue" /> }
          { disabled.includes("oldSmooth") || <path d={controlPointsToBezier(old)} fillOpacity={0} stroke="cyan" /> }

          { disabled.includes("midPoints") || midPoints.map(([x, y]) => <circle cx={x} cy={y} r={4} fill="purple" />)}
          { disabled.includes("thirdPoints") || thirdPoints.map(([x, y]) => <circle cx={x} cy={y} r={3} fill="green" />)}

          { disabled.includes("bSpline") || <circle cx={bSpline[0][0]} cy={bSpline[0][1]} r={3} fill="cyan" /> }
          { disabled.includes("bSpline") || bSpline.slice(1).map(([x1, y1, x2, y2, x, y]) => (
          <>
            <circle cx={x1} cy={y1} r={2} fill="cyan" />
            <circle cx={x2} cy={y2} r={2} fill="cyan" />
            <circle cx={x} cy={y} r={3} fill="cyan" />
          </>
          ))}

          { disabled.includes("smooth") || smooth.map(([x, y]) => <circle cx={x} cy={y} r={4} fill="blue" />)}
          { disabled.includes("oldSmooth") || old.map(([x, y]) => <circle cx={x} cy={y} r={4} fill="cyan" />)} }

          { disabled.includes("points") || points.map(([x, y]) => <circle cx={x} cy={y} r={4} fill="red" />)}
        </svg>
      </div>
    );
  }
}

export default App;

/**
 *
 * @param {string} input
 * @returns {number[][]}
 */
function parseInput (input) {
  const out = [];
  const re = /(\d+)/g;
  let point;
  let r;
  while(r = re.exec(input)) {
    if (point) {
      point.push(+r[1]);
      out.push(point);
      point = null;
    } else {
      point = [+r[1]];
    }
  }
  return out;
}

/**
 *
 * @param {number[][]} points
 */
function pointsToPolyline (points) {
  const out = [`M ${points[0][0]} ${points[0][1]}`];

  for (let i = 1; i< points.length; i++) {
    out.push(`L ${points[i][0]} ${points[i][1]}`);
  }

  return out.join(" ");
}

/**
 *
 * @param {number[][]} points
 */
function controlPointsToBezier (points) {
  const out = [`M ${points[0][0]} ${points[0][1]}`];

  for (let i = 1; i< points.length; i++) {
    out.push(`C ${points[i][0]} ${points[i][1]} ${points[i][2]} ${points[i][3]} ${points[i][4]} ${points[i][5]}`);
  }

  return out.join(" ");
}

/**
 *
 * @param {number[][]} points
 * @returns {number[][]}
 */
function getMidpoints (points) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i-1];
    const p1 = points[i];
    out.push([(p0[0] + p1[0])/2, (p0[1] + p1[1])/2]);
  }
  return out;
}

/**
 *
 * @param {number[][]} points
 * @returns {number[][]}
 */
function getThirdpoints (points) {
  const out = [];
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i-1];
    const p1 = points[i];
    out.push([(2*p0[0] + p1[0])/3, (2*p0[1] + p1[1])/3]);
    out.push([(p0[0] + 2*p1[0])/3, (p0[1] + 2*p1[1])/3]);
  }
  return out;
}

/**
 * Treats `points` argument as list of B control points
 * @see http://www.math.ucla.edu/~baker/149.1.02w/handouts/dd_splines.pdf
 * @param {number[][]} points
 * @returns {number[][]}
 */
function getBSpline (points) {
  const out = [[points[0][0], points[0][1]]];

  for (let i = 1; i < points.length - 1; i++) {
    const B_1 = points[i-1];
    const B0 = points[i];
    const B1 = points[i+1];

    const B_1x = B_1[0];
    const B0x = B0[0];
    const B1x = B1[0];
    const B_1y = B_1[1];
    const B0y = B0[1];
    const B1y = B1[1];

    const S0x = B_1x / 6 + 2/3 * B0x + B1x / 6;
    const S0y = B_1y / 6 + 2/3 * B0y + B1y / 6;

    out.push([
      2/3 * B_1x + 1/3 * B0x,
      2/3 * B_1y + 1/3 * B0y,
      1/3 * B_1x + 2/3 * B0x,
      1/3 * B_1y + 2/3 * B0y,
      S0x,
      S0y,
    ]);
  }

  const Bn_1 = points[points.length - 2];
  const Bn = points[points.length - 1];

  const Bn_1x = Bn_1[0];
  const Bnx = Bn[0];
  const Bn_1y = Bn_1[1];
  const Bny = Bn[1];

  const Sn = Bn;

  out.push([
    2/3 * Bn_1x + 1/3 * Bnx,
    2/3 * Bn_1y + 1/3 * Bny,
    1/3 * Bn_1x + 2/3 * Bnx,
    1/3 * Bn_1y + 2/3 * Bny,
    Sn[0],
    Sn[1],
  ]);

  return out;
}

/**
 * Do inverse matrix calculation to solve linear equations to get S points
 * @see http://www.math.ucla.edu/~baker/149.1.02w/handouts/dd_splines.pdf
 * @param {number[][]} points
 * @returns {number[][]}
 */
function getReverseBSpline (points) {
  const m141 = generate141Matrix(points.length);
  const m_inv = matrix_invert(m141);

  const vec_x = [];
  const vec_y = [];

  vec_x.push(6 * points[1][0] - points[0][0]);
  vec_y.push(6 * points[1][1] - points[0][1]);

  const l = points.length;

  for (let i = 2; i < l - 2; i++) {
    vec_x.push(6 * points[i][0]);
    vec_y.push(6 * points[i][1]);
  }

  vec_x.push(6 * points[l-2][0] - points[l-1][0]);
  vec_y.push(6 * points[l-2][1] - points[l-1][1]);

  const Bx = matrix_mulitply(m_inv, vec_x);
  const By = matrix_mulitply(m_inv, vec_y);

  Bx.unshift(points[0][0]);
  By.unshift(points[0][1]);

  Bx.push(points[l-1][0]);
  By.push(points[l-1][1]);

  return zip(Bx, By);
}

function oldReverseBSpline (points) {
  const l = points.length;

  const S0 = points[0];
  const S1 = points[1];
  const S2 = points[2];
  const S3 = points[3];
  const S4 = points[4];

  const B = [];

  const B0 = S0;

  B.push(B0);

  const B1x = (15 * (6 * S1[0] - S0[0]) - 4 * 6 * S2[0] + (6 * S3[0] + S4[0])) / 56;
  const B1y = (15 * (6 * S1[1] - S0[1]) - 4 * 6 * S2[1] + (6 * S3[1] + S4[1])) / 56;

  B.push([B1x, B1y]);

  for (let i = 2; i < l - 2; i++) {
    const S_2 = points[i - 2];
    const S_1 = points[i - 1];
    const S0 = points[i];
    const S1 = points[i + 1];
    const S2 = points[i + 2];

    const Bix = (-4 * (6 * S_1[0] - S_2[0]) + 16 * 6 * S0[0] - 4 * (6 * S1[0] - S2[0])) / 56;
    const Biy = (-4 * (6 * S_1[1] - S_2[1]) + 16 * 6 * S0[1] - 4 * (6 * S1[1] - S2[1])) / 56;

    B.push([Bix, Biy]);
  }

  const Sn_3 = points[l-4];
  const Sn_2 = points[l-3];
  const Sn_1 = points[l-2];
  const Sn = points[l-1];

  const Bn_1x = (6 * Sn_3[0] - 4 * 6 * Sn_2[0] + 15 * 6 * (Sn_1[0] - Sn[0])) / 56;
  const Bn_1y = (6 * Sn_3[1] - 4 * 6 * Sn_2[1] + 15 * 6 * (Sn_1[1] - Sn[1])) / 56;

  B.push([Bn_1x, Bn_1y]);

  B.push(Sn);

  return B;

}

function generate141Matrix (n) {
  const M = [];
  for (let i = 0; i < n - 2; i++) {
    const r = [];
    for (let j = 0; j < n - 2; j++) {
      if (j - i == -1) r.push(1);
      else if (j - i == 0) r.push(4);
      else if (j - i == 1) r.push(1);
      else r.push(0);
    }
    M.push(r);
  }
  return M;
}

// Returns the inverse of matrix `M`.
function matrix_invert(M){
  // I use Guassian Elimination to calculate the inverse:
  // (1) 'augment' the matrix (left) by the identity (on the right)
  // (2) Turn the matrix on the left into the identity by elemetry row ops
  // (3) The matrix on the right is the inverse (was the identity matrix)
  // There are 3 elemtary row ops: (I combine b and c in my code)
  // (a) Swap 2 rows
  // (b) Multiply a row by a scalar
  // (c) Add 2 rows

  //if the matrix isn't square: exit (error)
  if(M.length !== M[0].length){return;}

  //create the identity matrix (I), and a copy (C) of the original
  var i=0, ii=0, j=0, dim=M.length, e=0, t=0;
  var I = [], C = [];
  for(i=0; i<dim; i+=1){
      // Create the row
      I[I.length]=[];
      C[C.length]=[];
      for(j=0; j<dim; j+=1){

          //if we're on the diagonal, put a 1 (for identity)
          if(i==j){ I[i][j] = 1; }
          else{ I[i][j] = 0; }

          // Also, make the copy of the original
          C[i][j] = M[i][j];
      }
  }

  // Perform elementary row operations
  for(i=0; i<dim; i+=1){
      // get the element e on the diagonal
      e = C[i][i];

      // if we have a 0 on the diagonal (we'll need to swap with a lower row)
      if(e==0){
          //look through every row below the i'th row
          for(ii=i+1; ii<dim; ii+=1){
              //if the ii'th row has a non-0 in the i'th col
              if(C[ii][i] != 0){
                  //it would make the diagonal have a non-0 so swap it
                  for(j=0; j<dim; j++){
                      e = C[i][j];       //temp store i'th row
                      C[i][j] = C[ii][j];//replace i'th row by ii'th
                      C[ii][j] = e;      //repace ii'th by temp
                      e = I[i][j];       //temp store i'th row
                      I[i][j] = I[ii][j];//replace i'th row by ii'th
                      I[ii][j] = e;      //repace ii'th by temp
                  }
                  //don't bother checking other rows since we've swapped
                  break;
              }
          }
          //get the new diagonal
          e = C[i][i];
          //if it's still 0, not invertable (error)
          if(e==0){return}
      }

      // Scale this row down by e (so we have a 1 on the diagonal)
      for(j=0; j<dim; j++){
          C[i][j] = C[i][j]/e; //apply to original matrix
          I[i][j] = I[i][j]/e; //apply to identity
      }

      // Subtract this row (scaled appropriately for each row) from ALL of
      // the other rows so that there will be 0's in this column in the
      // rows above and below this one
      for(ii=0; ii<dim; ii++){
          // Only apply to other rows (we want a 1 on the diagonal)
          if(ii==i){continue;}

          // We want to change this element to 0
          e = C[ii][i];

          // Subtract (the row above(or below) scaled by e) from (the
          // current row) but start at the i'th column and assume all the
          // stuff left of diagonal is 0 (which it should be if we made this
          // algorithm correctly)
          for(j=0; j<dim; j++){
              C[ii][j] -= e*C[i][j]; //apply to original matrix
              I[ii][j] -= e*I[i][j]; //apply to identity
          }
      }
  }

  //we've done all operations, C should be the identity
  //matrix I should be the inverse:
  return I;
}

function matrix_mulitply (matrix, vector) {
  if (matrix[0].length != vector.length) {
    throw new Error(`Matrix and Vector sizes don't match: ${matrix[0].length} vs ${vector.length}`);
  }

  const out = [];

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    let v = 0;
    for (let j = 0; j < row.length; j++) {
      v += row[j] * vector[j];
    }
    out.push(v);
  }

  return out;
}

function zip (...arrays) {
  const out = [];

  for (let i = 0; i < arrays[0].length; i++) {
    out.push(arrays.map(a => a[i]));
  }

  return out;
}