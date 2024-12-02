document.addEventListener('DOMContentLoaded', function () {
    loadSidebar();
    loadStatistics();
    initializeCharts();
});

function loadSidebar() {
    fetch('/html/components/sidebar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('sidebarContainer').innerHTML = html;
            const scriptContent = html.match(/<script id="sidebarScript">([\s\S]*?)<\/script>/);
            if (scriptContent && scriptContent[1]) {
                eval(scriptContent[1]);
            }
        })
        .catch(error => console.error('Error loading sidebar:', error));
}

function loadStatistics() {
    fetch('/api/statistics')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);
            if (data && data.overview) {
                updateStatisticsCards(data.overview);
                updateCharts(data);
            } else {
                console.error('Invalid data structure:', data);
            }
        })
        .catch(error => {
            console.error('Error loading statistics:', error);
            updateStatisticsCards({
                totalReservations: 0,
                avgStayDuration: 0,
                popularRoomType: '데이터 없음'
            });
        });
}

function updateStatisticsCards(overview) {
    if (!overview) {
        console.error('Overview data is undefined');
        return;
    }

    const elements = {
        'totalReservations': overview.totalReservations || 0,
        'avgStayDuration': overview.avgStayDuration || 0,
        'popularRoomType': overview.popularRoomType || '데이터 없음'
    };

    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        } else {
            console.error(`Element with id '${id}' not found`);
        }
    }
}

function initializeCharts() {
    // 월별 예약 추이 차트
    new Chart(document.getElementById('monthlyReservationsChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '예약 수',
                data: [],
                borderColor: '#007bff',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // 객실 타입별 분포 차트
    new Chart(document.getElementById('roomTypeDistributionChart'), {
        type: 'pie',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#007bff',
                    '#28a745',
                    '#ffc107',
                    '#dc3545'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // 요일별 패턴 차트
    new Chart(document.getElementById('weekdayPatternChart'), {
        type: 'bar',
        data: {
            labels: ['일', '월', '화', '수', '목', '금', '토'],
            datasets: [{
                label: '체크인',
                data: [],
                backgroundColor: '#007bff'
            }, {
                label: '체크아웃',
                data: [],
                backgroundColor: '#dc3545'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // 숙박 기간 분포 차트
    new Chart(document.getElementById('stayDurationChart'), {
        type: 'bar',
        data: {
            labels: ['1일', '2일', '3일', '4일', '5일+'],
            datasets: [{
                label: '예약 수',
                data: [],
                backgroundColor: '#28a745'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function updateCharts(data) {
    if (!data) {
        console.error('Chart data is undefined');
        return;
    }

    // 월별 예약 추이 차트 업데이트
    updateMonthlyChart(data.monthlyTrend);
    
    // 객실 타입별 분포 차트 업데이트
    updateRoomTypeChart(data.roomTypeDistribution);
    
    // 요일별 패턴 차트 업데이트
    updateWeekdayChart(data.weekdayPattern);
    
    // 숙박 기간 분포 차트 업데이트
    updateDurationChart(data.stayDurationDistribution);
}

// 각 차트 업데이트 함수들
function updateMonthlyChart(monthlyTrend) {
    const chart = Chart.getChart('monthlyReservationsChart');
    if (chart && monthlyTrend) {
        chart.data.labels = monthlyTrend.map(item => item.month);
        chart.data.datasets[0].data = monthlyTrend.map(item => item.count);
        chart.update();
    }
}

function updateRoomTypeChart(roomTypeDistribution) {
    const chart = Chart.getChart('roomTypeDistributionChart');
    if (chart && roomTypeDistribution) {
        chart.data.labels = roomTypeDistribution.map(item => item.roomType);
        chart.data.datasets[0].data = roomTypeDistribution.map(item => item.count);
        chart.update();
    }
}

function updateWeekdayChart(weekdayPattern) {
    const chart = Chart.getChart('weekdayPatternChart');
    if (chart && weekdayPattern) {
        chart.data.datasets[0].data = weekdayPattern.checkIns;
        chart.data.datasets[1].data = weekdayPattern.checkOuts;
        chart.update();
    }
}

function updateDurationChart(stayDurationDistribution) {
    const chart = Chart.getChart('stayDurationChart');
    if (chart && stayDurationDistribution) {
        chart.data.labels = stayDurationDistribution.map(item => item.duration);
        chart.data.datasets[0].data = stayDurationDistribution.map(item => item.count);
        chart.update();
    }
}

// 세션 체크
function checkSession() {
    fetch('/api/check-session')
        .then(response => {
            if (!response.ok) {
                window.location.href = '/login';
            }
        })
        .catch(() => {
            window.location.href = '/login';
        });
}

document.addEventListener('DOMContentLoaded', checkSession);
window.addEventListener('focus', checkSession);
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        checkSession();
    }
});
