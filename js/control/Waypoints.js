BR.Waypoints = L.Class.extend({
    /**
     * @type {Object}
     */
    options: {},

    /**
     * @type {BR.Routing}
     */
    routing: null,

    waypoints: [],

    /**
     * @param {Map} map
     * @param {BR.Routing} routing
     * @param {object} options
     */
    initialize: function (map, routing, options) {
        this.map = map;
        this.routing = routing;
        L.setOptions(this, options);

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            this.initSorting();
            this.initEventListeners();
        } else {
            document.addEventListener('DOMContentLoaded', () => this.initSorting());
            this.initEventListeners();
        }
    },

    /**
     * Called by BR.Sidebar when tab is activated
     */
    show: function () {
        this.active = true;
        this.options.requestUpdate(this);
    },

    /**
     * Called by BR.Sidebar when tab is deactivated
     */
    hide: function () {
        this.active = false;
    },

    update: function (trackPolyline, segments, segmentsLayer, latLngs) {
        this.waypoints = latLngs;

        if (!this.active) {
            return;
        }

        if (segments.length === 0) {
            const contentContainer = document.getElementById('waypoints-list');
            contentContainer.innerHTML = '';
        }

        this.render(segments, latLngs);
    },

    initEventListeners: function () {},

    render: function (segments, latLngs) {
        const contentContainer = document.getElementById('waypoints-list');
        contentContainer.innerHTML = '';

        const template = document.getElementById('waypoint-item');

        let totalDistance = 0;
        let totalDuration = 0;
        let totalFilteredAscend = 0;
        let totalPlainAscend = 0;

        for (let index = 0; index < latLngs.length; index++) {
            let segmentDistance = 0;
            let segmentDuration = 0;
            let filteredAscend = 0;
            let plainAscend = 0;

            if (index > 0 && segments[index - 1]?.feature?.properties?.['track-length']) {
                segmentDistance = segments[index - 1].feature.properties['track-length'];
                segmentDuration = segments[index - 1].feature.properties['total-time'];
                filteredAscend = segments[index - 1].feature.properties['filtered ascend'];
                plainAscend = segments[index - 1].feature.properties['plain-ascend'];

                totalDistance += parseInt(segmentDistance);
                totalDuration += parseInt(segmentDuration);
                totalFilteredAscend += parseInt(filteredAscend);
                totalPlainAscend += parseInt(plainAscend);
            }

            const waypointItemTemplate = template.content.cloneNode(true);
            const waypointItem = waypointItemTemplate.querySelector('.waypoint');
            const waypointItemIcon = waypointItem.querySelector('.waypoint-icon');
            const waypointStatsIcons = waypointItem.querySelectorAll('.waypoint-stats-icon');
            const waypointItemDistance = waypointItem.querySelector('.waypoint-stats-value-distance');
            const waypointItemAscend = waypointItem.querySelector('.waypoint-stats-value-ascend');
            const waypointItemDuration = waypointItem.querySelector('.waypoint-stats-value-duration');
            const waypointItemDistanceUnit = waypointItem.querySelector('.waypoint-stats-unit-distance');
            const waypointItemAscendUnit = waypointItem.querySelector('.waypoint-stats-unit-ascend');
            const waypointItemDurationUnit = waypointItem.querySelector('.waypoint-stats-unit-duration');
            const waypointItemHandleDown = waypointItemTemplate.querySelector('.waypoint-handle-down');
            const waypointItemHandleUp = waypointItemTemplate.querySelector('.waypoint-handle-up');
            const waypointOsmLink = waypointItemTemplate.querySelector('.waypoint-osm-link');
            const waypointGeoLink = waypointItemTemplate.querySelector('.waypoint-geo-link');

            waypointItem.setAttribute('title', `${latLngs[index].lat.toFixed(5)}, ${latLngs[index].lng.toFixed(5)}`);
            waypointItem.setAttribute('data-index', index);

            const lat = latLngs[index].lat.toFixed(5);
            const lng = latLngs[index].lng.toFixed(5);

            waypointOsmLink.href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`;
            waypointGeoLink.href = `geo:${lat},${lng}`;
            waypointGeoLink.innerText = waypointGeoLink.href;

            if (index < latLngs.length - 1) {
                waypointItemHandleDown.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <path fill="currentColor" d="M13.069 5.157L8.384 9.768a.546.546 0 0 1-.768 0L2.93 5.158a.552.552 0 0 0-.771 0a.53.53 0 0 0 0 .759l4.684 4.61a1.65 1.65 0 0 0 2.312 0l4.684-4.61a.53.53 0 0 0 0-.76a.552.552 0 0 0-.771 0"/>
</svg>`;
            }
            if (index > 0) {
                waypointItemHandleUp.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <path fill="currentColor" d="m2.931 10.843l4.685-4.611a.546.546 0 0 1 .768 0l4.685 4.61a.55.55 0 0 0 .771 0a.53.53 0 0 0 0-.759l-4.684-4.61a1.65 1.65 0 0 0-2.312 0l-4.684 4.61a.53.53 0 0 0 0 .76a.55.55 0 0 0 .771 0"/>
</svg>`;
            }

            if (index === 0) {
                waypointItemIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M18.25 12L8.5 17.629V6.37L18.25 12Z"/></svg>`;
                waypointItemIcon.classList.add('waypoint-icon-start');
                waypointItemDistanceUnit.innerHTML = '';
                waypointItemAscendUnit.innerHTML = '';
                waypointItemDurationUnit.innerHTML = '';
                waypointStatsIcons.forEach((icon) => {
                    icon.innerHTML = '';
                });
            } else if (index === latLngs.length - 1) {
                waypointItemIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7 17V7h10v10H7Z"/></svg>`;
                waypointItemIcon.classList.add('waypoint-icon-end');
            } else {
                waypointItemIcon.innerHTML = BR.WaypointLabel.getLabel(index);
            }

            if (index > 0) {
                waypointItemDistance.innerHTML = `${this.formatDistance(segmentDistance)}`;
                waypointItemDistance.setAttribute('title', `${segmentDistance} m, (total: ${totalDistance} m)`);
                waypointItemDuration.innerHTML = `${this.formatDuration(segmentDuration)}`;
                waypointItemDuration.setAttribute(
                    'title',
                    `${this.formatDurationHMS(segmentDuration)} h, (total: ${this.formatDuration(totalDuration)} h)`
                );
                waypointItemAscend.innerHTML = `${filteredAscend}`;
                waypointItemAscend.setAttribute(
                    'title',
                    `${filteredAscend} m | ${plainAscend} m, (total: ${totalFilteredAscend} m | ${totalPlainAscend} m)`
                );
            }

            contentContainer.appendChild(waypointItem);
        }
    },

    initSorting: function () {
        const waypointsContainer = document.getElementById('waypoints-list');

        if (!waypointsContainer) {
            throw new Error('Waypoints container not found for sorting.');
        }

        this.initSortingButtons(waypointsContainer);
        this.initSortingDragging(waypointsContainer);
    },

    initSortingButtons: function (waypointsContainer) {
        waypointsContainer.addEventListener('click', (e) => {
            const handle = e.target.closest('.waypoint-handle-up, .waypoint-handle-down');
            if (!handle) {
                return;
            }
            if (handle.classList.contains('waypoint-handle-up')) {
                const waypoint = handle.closest('.waypoint');
                const waypointIndex = parseInt(waypoint.getAttribute('data-index'));
                const previousWaypoint = waypoint.previousElementSibling;
                if (previousWaypoint) {
                    waypointsContainer.insertBefore(waypoint, previousWaypoint);
                    this.routing.swapWaypoints(waypointIndex, waypointIndex - 1);
                }

                return;
            }
            if (handle.classList.contains('waypoint-handle-down')) {
                const waypoint = e.target.closest('.waypoint');
                const waypointIndex = parseInt(waypoint.getAttribute('data-index'));
                const nextWaypoint = waypoint.nextElementSibling;
                if (nextWaypoint) {
                    waypointsContainer.insertBefore(nextWaypoint, waypoint);
                    this.routing.swapWaypoints(waypointIndex, waypointIndex + 1);
                }
            }
        });
    },

    initSortingDragging: function (waypointsContainer) {
        let draggedItem = null;

        waypointsContainer.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('waypoint')) {
                e.target.classList.add('dragging');
                e.dataTransfer.setData('text/plain', ''); // For Firefox compatibility
                e.target.style.opacity = '0.4'; // item which stays in place will be faded
                draggedItem = e.target;
            }
        });

        waypointsContainer.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('waypoint')) {
                if (!draggedItem) {
                    return;
                }
                draggedItem.classList.add('dragging');
                draggedItem.style.opacity = '1.0';
                draggedItem = null;
            }
        });

        waypointsContainer.addEventListener('dragenter', (e) => {
            e.preventDefault();
            let target = e.target;
            // Text nodes are not valid targets/have no closest() method:
            while (target.nodeType !== Node.ELEMENT_NODE) {
                target = target.parentNode;
            }
            const closestWaypoint = target.closest('.waypoint');
            if (closestWaypoint) {
                closestWaypoint.style.background = 'gold';
            }
        });

        waypointsContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            let target = e.target;
            while (target.nodeType !== Node.ELEMENT_NODE) {
                target = target.parentNode;
            }
            const closestWaypoint = target.closest('.waypoint');
            if (closestWaypoint) {
                closestWaypoint.style.background = '';
            }
        });

        waypointsContainer.addEventListener('dragover', (e) => {
            let target = e.target;
            while (target.nodeType !== Node.ELEMENT_NODE) {
                target = target.parentNode;
            }
            const closestWaypoint = target.closest('.waypoint');
            if (closestWaypoint) {
                e.preventDefault(); // This allows us to drop.
            }
        });

        waypointsContainer.addEventListener('drop', (e) => {
            let target = e.target;
            while (target && !target.classList.contains('waypoint')) {
                target = target.parentNode;
            }

            const waypointsList = document.querySelector('.waypoints-container');

            if (target && draggedItem) {
                e.preventDefault(); // This is necessary to prevent the browser's default handling of the data

                // Move the draggedItem to its new position
                if (target !== draggedItem) {
                    const allItems = Array.from(waypointsList.querySelectorAll('.waypoint'));
                    const draggedIndex = allItems.indexOf(draggedItem);
                    const droppedIndex = allItems.indexOf(target);

                    if (draggedIndex > droppedIndex) {
                        waypointsList.insertBefore(draggedItem, target);
                    } else {
                        waypointsList.insertBefore(draggedItem, target.nextSibling);
                    }

                    this.routing.swapWaypoints(draggedIndex, droppedIndex);
                }

                // Reset styles and draggedItem variable
                draggedItem.style.opacity = '1';
                draggedItem = null;
                target.style.background = '';
            }
        });
    },

    /**
     * Format a distance with two decimal places.
     *
     * @param {number} meters
     * @returns {string}
     */
    formatDistance: function (meters) {
        return (meters / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatDuration: function (seconds) {
        return Math.trunc(seconds / 3600) + ':' + ('0' + Math.trunc((seconds % 3600) / 60)).slice(-2);
    },

    formatDurationHMS: function (seconds) {
        return this.formatDuration(seconds) + ':' + ('0' + Math.trunc(seconds % 60)).slice(-2);
    },
});
