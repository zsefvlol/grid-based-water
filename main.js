/**
 * Created by Mengtian on 2015/9/24.
 */

var gridWater = {

    //grid data, 0 air, 1 wall, 2 water
    grid: [
        [1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,2,2,1,2,2,1,0,0,0,0,0,0,0,0,0,0],
        [1,2,2,1,2,2,1,0,0,0,0,0,0,0,0,0,1],
        [1,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],

    connectivity : [],

    //render grid to divs
    render: function(){
        var gridDiv = $('#grid');
        gridDiv.html("");
        var gridClass = ['air', 'wall', 'water'];
        var connectivity = this.connectivity;
        $(this.grid).each(function(index,line){
            var lineDom = '';
            for(var i in line){
                //i = parseInt(i);
                var innerText = '';
                if (typeof connectivity[index] != 'undefined'
                    && connectivity[index][i]>-1){
                    //console.log(connectivity[index][i],index,i);
                    innerText = connectivity[index][i];
                }
                lineDom += '<div class="g '+ gridClass[line[i]] +'" m="'+index+'" n="'+i+'">'+innerText+'</div>';
            }
            gridDiv.append('<div class="line">' + lineDom + '</div>');
        });

        //click to change the type of grid
        _self = this;
        $('.g').on('click',function(){
            var m=$(this).attr('m');
            var n=$(this).attr('n');
            $(this).removeClass(gridClass[_self.grid[m][n]]);
            _self.grid[m][n] ++;
            if(_self.grid[m][n] > 2) _self.grid[m][n] = 0;
            $(this).addClass(gridClass[_self.grid[m][n]]);
            _self.findConnectedBlock();
            _self.render();
        });
        return true;
    },

    //next step
    next: function(){
        var g = this.grid;
        var c = this.connectivity;
        var h = this.grid.length;
        var w = this.grid[0].length;
        var moved = false;

        //find all blocks
        var connectBlockIndex = [];
        c.map(function(row){
            row.map(function(col){
                if(col!=-1 && $.inArray(col, connectBlockIndex)<0) connectBlockIndex.push(col);
            });
        });

        //for each block
        for (var i in connectBlockIndex){
            var blockIndex = connectBlockIndex[i];

            console.log('block index', blockIndex);

            //find top water height
            var topHeight = -1;
            for (var m=0; m<h; m++) {
                if (topHeight >= 0) break;
                for (var n=0; n<w; n++) {
                    if(c[m][n] == blockIndex){
                        topHeight = m;
                        break;
                    }
                }
            }
            console.log('topheight',topHeight);

            //find grid to move
            var gridsToMove = [];
            //[[1,3,2]] means [1][3] grid's priority is 2
            //lower is less urgent
            //  0   1   2   3
            //
            // 000 120 000 000
            // 121 120 120 120
            // 111 120 110 000
            //
            // 0 ref to the water grid need to be pushed up, when there's pressure from bottom
            // 1&2 ref to the water grid need to be pushed right
            // 3 ref to the water grid need to be pulled down
            // all grids' priority of the same block must be the same

            //add water grid which need to move this time
            //to make sure all grid-to-move are of same priority
            insertGridToMove = function(m,n,p){
                console.log(m,n,p);
                if (gridsToMove.length) {
                    if (gridsToMove[0][2] > p) return;
                    else if(gridsToMove[0][2] == p){

                        //notice, case 1 has complex rule
                        //if same col grid are pushed into this
                        //only the lowest one will be saved.
                        if(p == 1){
                            var sameColFlag = false;
                            for (var i in gridsToMove){
                                if(gridsToMove[i][1] == n){
                                    sameColFlag = true;
                                    break;
                                }
                            }
                            if (sameColFlag){
                                gridsToMove[i][0] = gridsToMove[i][0] > m ? gridsToMove[i][0] : m;
                            }
                            else gridsToMove.push([m,n,p]);
                        }
                        else gridsToMove.push([m,n,p]);
                        return;
                    }
                    else{
                        gridsToMove = [[m,n,p]];
                        return;
                    }
                } else {
                    gridsToMove.push([m, n, p]);
                    return ;
                }

            };

            //find the top water grid, and remove it
            removeTopWaterGrid = function(cm, cn){
                for (var m=0; m<h; m++) {
                    for (var n=0; n<w; n++) {
                        if(c[m][n] == blockIndex) {
                            //another trick, if the top grid is of same col as the grid to move
                            //try grid other side this line, to make the whole line move
                            if(cn==n){
                                for(var i=w; i>n; i--){
                                    if(c[m][i] == blockIndex){
                                        n = i;
                                        break;
                                    }
                                }
                            }
                            g[m][n] = 0;
                            c[m][n] = -1;
                            return [m,n];
                        }
                    }
                }
            };


            //test each grid, check if it needs to move
            for (var m=topHeight; m<h; m++) {
                for (var n=0; n<w; n++) {
                    if(c[m][n] == blockIndex){
                        //test if case 0
                        if( m>topHeight+1 && (n==0 || g[m][n-1]>0) && (m==h-1 || g[m+1][n]>0)
                            && (n==w-1 || g[m][n+1]>0) && (m>0 && g[m-1][n]==0)){
                            insertGridToMove(m,n,0);
                        }
                        //test if case 1
                        else if( m>topHeight && ((n>0 && g[m][n-1]==0) || (n<w-1 && g[m][n+1]==0))
                             && (m==h-1 || g[m+1][n]==2)){
                            insertGridToMove(m,n,1);
                        }
                        //test if case 2
                        else if( m>topHeight && ((n>0 && g[m][n-1]==0) || (n<w-1 && g[m][n+1]==0))
                            && (m==h-1 || g[m+1][n]==1)){
                            insertGridToMove(m,n,2);
                        }
                        //test if case 3
                        else if( m<h-1 && g[m+1][n]==0){
                            insertGridToMove(m,n,3);
                        }
                    }
                }
            }

            console.log("grids to move", gridsToMove);
            if(gridsToMove.length) moved = true;

            //move
            gridsToMove.map(function(grid){
                var m = grid[0], n=grid[1], priority = grid[2];
                //0 means move up
                if(priority == 0){
                    gridFrom = removeTopWaterGrid(m,n);
                    g[m-1][n] = 2;
                    c[m-1][n] = c[m][n];
                }
                //1 or 2 means left or right or both
                else if(priority == 1 || priority == 2){
                    if(g[m][n-1] == 0){
                        gridFrom = removeTopWaterGrid(m,n);
                        g[m][n-1] = 2;
                        c[m][n-1] = c[m][n];
                    }
                    if(g[m][n+1] == 0){
                        gridFrom = removeTopWaterGrid(m,n);
                        g[m][n+1] = 2;
                        c[m][n+1] = c[m][n];
                    }
                }
                //3 means move down
                else if(priority == 3){
                    gridFrom = removeTopWaterGrid(m,n);
                    g[m+1][n] = 2;
                    c[m+1][n] = c[m][n];
                }
            });

        }

        this.findConnectedBlock();
        this.render();
        if(!moved && this.timer) {
            clearInterval(this.timer);
            this.timer = '';
        }
    },

    //find connected blocks
    findConnectedBlock: function(){
        var m = this.grid.length;
        var n = this.grid[0].length;
        this.connectivity = this.buildArray(m, n, -1);
        var blockIndex = 0;

        //update block number, internal use, see usage below
        var update = function(connectivity, oldNum, newNum){
            return connectivity.map(function(row){
                return row.map(function(col){
                    return col == oldNum ? newNum : col;
                });
            });
        };

        //for each grid...
        for (var i in this.grid){
            for (var j in this.grid[i]){
                //if not water grid, continue
                if(this.grid[i][j] < 2) continue;
                //if so
                //test if top grid is water grid.
                if(i>0 && this.grid[i-1][j] == 2){
                    //if so, mark this grid same as top
                    this.connectivity[i][j] = this.connectivity[i-1][j];
                }
                //test if left grid is water grid.
                if(j>0 && this.grid[i][j-1] == 2){
                    //if so
                    //if this grid is not marked
                    if(this.connectivity[i][j] == -1){
                        this.connectivity[i][j] = this.connectivity[i][j-1];
                    }
                    //if this grid is already markd, and not same as left grid
                    else if(this.connectivity[i][j] != this.connectivity[i][j-1]){
                        //update all the mark to connect to two part
                        this.connectivity = update(this.connectivity, this.connectivity[i][j], this.connectivity[i][j-1]);
                    }
                }
                //if not connected to others, mark as a new block
                if(this.connectivity[i][j] == -1) this.connectivity[i][j] = blockIndex++;
                //test if connected with right grid.
                //if(j<n-1 && this.grid[i][j+1] == 2 && this.connectivity[i][j] != this.connectivity[i][j+1]){
                //    this.connectivity = update(this.connectivity, this.connectivity[i][j], this.connectivity[i][j+1]);
                //}
                //test if connected with bottom grid.
                //if(i<m-1 && this.grid[i+1][j] == 2 && this.connectivity[i][j] != this.connectivity[i+1][j]){
                //    this.connectivity = update(this.connectivity, this.connectivity[i][j], this.connectivity[i+1][j]);
                //}

            }
        }
    },


    //build array
    buildArray: function(m, n, v){
        var array = [], array_row = [], i = 0;
        for (i=0;i<n;i++) array_row.push(v);
        for (i=0;i<m;i++) array.push(array_row.slice(0));
        return array;
    },

    timer:'',
    play: function(){
        if(!this.timer) this.timer = setInterval("gridWater.next()", '80');
    }

};

gridWater.findConnectedBlock();
gridWater.render();
