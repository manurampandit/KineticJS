(function() {
    Kinetic.DD = {
        anim: new Kinetic.Animation(),
        moving: false,
        offset: {
            x: 0,
            y: 0
        }
    };
    Kinetic.Node.prototype._startDrag = function() {
        var that = this, dd = Kinetic.DD, stage = this.getStage(), pos = stage.getUserPosition();

        if(pos) {
            var m = this.getTransform().getTranslation(), ap = this.getAbsolutePosition(), nodeType = this.nodeType;

            dd.node = this;
            dd.offset.x = pos.x - ap.x;
            dd.offset.y = pos.y - ap.y;

            // Stage and Layer node types
            if(nodeType === 'Stage' || nodeType === 'Layer') {
                dd.anim.node = this;
                dd.anim.start();
            }

            // Group or Shape node types
            else {
                if(this.getDragOnTop()) {
                    this._buildTopLayer();
                    dd.anim.node = dd.topLayer;
                    dd.prevParent = this.getParent();
                    // WARNING: it's important to delay the moveTo operation,
                    // layer redraws, and anim.start() until after the method execution
                    // has completed or else there will be a flicker on mobile devices
                    // due to the time it takes to append the dd canvas to the DOM
                    setTimeout(function() {
                        that.moveTo(dd.topLayer);
                        dd.prevParent.getLayer().draw();
                        dd.topLayer.show();
                        dd.topLayer.draw();
                        dd.anim.start();
                    }, 0);
                }
                else {
                    dd.anim.node = this.getLayer();
                    dd.anim.start();
                }
            }
        }
    };
    Kinetic.Node.prototype._buildTopLayer = function() {
        var dd = Kinetic.DD, stage = this.getStage(), nodeType = this.nodeType, lastContainer, group;

        // re-construct node tree
        this._eachAncestorReverse(function(node) {
            if(node.nodeType === 'Layer') {
                dd.topLayer = new Kinetic.Layer({
                    x: node.getX(),
                    y: node.getY(),
                    scale: node.getScale(),
                    rotation: node.getRotation(),
                    visible: false
                });
                lastContainer = dd.topLayer;
                stage.add(dd.topLayer);
                dd.topLayer.getCanvas().getElement().className = 'kinetic-drag-and-drop-layer';
            }
            else if(node.nodeType === 'Group') {
                group = new Kinetic.Group({
                    x: node.getX(),
                    y: node.getY(),
                    scale: node.getScale(),
                    rotation: node.getRotation()
                });

                lastContainer.add(group);
                lastContainer = group;
            }
        });
    };
    Kinetic.DD._drag = function(evt) {
        var dd = Kinetic.DD, node = dd.node;

        if(node) {
            var pos = node.getStage().getUserPosition();
            var dbf = node.attrs.dragBoundFunc;

            var newNodePos = {
                x: pos.x - dd.offset.x,
                y: pos.y - dd.offset.y
            };

            if(dbf !== undefined) {
                newNodePos = dbf.call(node, newNodePos, evt);
            }

            node.setAbsolutePosition(newNodePos);

            if(!dd.moving) {
                dd.moving = true;
                node.setListening(false);

                // execute dragstart events if defined
                node._handleEvent('dragstart', evt);
            }

            // execute user defined ondragmove if defined
            node._handleEvent('dragmove', evt);
        }
    };
    Kinetic.DD._endDrag = function(evt) {
        var dd = Kinetic.DD, node = dd.node;
        if(node) {
            var nodeType = node.nodeType;
            node.setListening(true);
            if(nodeType === 'Stage') {
                node.draw();
            }
            else {
                if((nodeType === 'Group' || nodeType === 'Shape') && node.getDragOnTop() && dd.prevParent) {
                    node.moveTo(dd.prevParent);
                    dd.topLayer.remove();
                    dd.prevParent = null;
                    dd.topLayer = null;
                }

                node.getLayer().draw();
            }

            // only fire dragend event if the drag and drop
            // operation actually started.  This can be detected by
            // checking dd.moving
            if(dd.moving) {
                dd.moving = false;
                node._handleEvent('dragend', evt);
            }
        }
        dd.node = null;
        dd.anim.stop();
    };
    /**
     * set draggable
     * @name setDraggable
     * @methodOf Kinetic.Node.prototype
     * @param {String} draggable
     */
    Kinetic.Node.prototype.setDraggable = function(draggable) {
        this.setAttr('draggable', draggable);
        this._dragChange();
    };
    /**
     * get draggable
     * @name getDraggable
     * @methodOf Kinetic.Node.prototype
     */
    Kinetic.Node.prototype.getDraggable = function() {
        return this.attrs.draggable;
    };
    /**
     * determine if node is currently in drag and drop mode
     * @name isDragging
     * @methodOf Kinetic.Node.prototype
     */
    Kinetic.Node.prototype.isDragging = function() {
        var dd = Kinetic.DD;
        return dd.node && dd.node._id === this._id && dd.moving;
    };

    Kinetic.Node.prototype._listenDrag = function() {
        this._dragCleanup();
        this.on('mousedown.kinetic touchstart.kinetic', this._startDrag);
    };

    Kinetic.Node.prototype._dragChange = function() {
        if(this.attrs.draggable) {
            this._listenDrag();
        }
        else {
            // remove event listeners
            this._dragCleanup();

            /*
             * force drag and drop to end
             * if this node is currently in
             * drag and drop mode
             */
            var stage = this.getStage();
            var dd = Kinetic.DD;
            if(stage && dd.node && dd.node._id === this._id) {
                dd._endDrag();
            }
        }
    };
    Kinetic.Node.prototype._dragCleanup = function() {
        this.off('mousedown.kinetic');
        this.off('touchstart.kinetic');
    };
    /**
     * get draggable.  Alias of getDraggable()
     * @name isDraggable
     * @methodOf Kinetic.Node.prototype
     */
    Kinetic.Node.prototype.isDraggable = Kinetic.Node.prototype.getDraggable;

    Kinetic.Node.addGettersSetters(Kinetic.Node, ['dragBoundFunc', 'dragOnTop']);

    /**
     * set drag bound function.  This is used to override the default
     *  drag and drop position
     * @name setDragBoundFunc
     * @methodOf Kinetic.Node.prototype
     * @param {Function} dragBoundFunc
     */

    /**
     * set flag which enables or disables automatically moving the draggable node to a
     *  temporary top layer to improve performance.  The default is true
     * @name setDragOnTop
     * @methodOf Kinetic.Node.prototype
     * @param {Function} dragOnTop
     */

    /**
     * get dragBoundFunc
     * @name getDragBoundFunc
     * @methodOf Kinetic.Node.prototype
     */

    /**
     * get flag which enables or disables automatically moving the draggable node to a
     *  temporary top layer to improve performance.
     * @name getDragOnTop
     * @methodOf Kinetic.Node.prototype
     */
})();
