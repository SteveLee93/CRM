document.addEventListener('DOMContentLoaded', function() {
    // URL 파라미터에서 방 정보 가져오기
    const params = new URLSearchParams(window.location.search);
    const roomNumber = params.get('roomNumber');
    const roomType = params.get('roomType');
    
    console.log('Room Number:', roomNumber); // 디버깅
    
    if (roomNumber) document.getElementById('roomNumber').value = roomNumber;
    if (roomType) document.getElementById('roomType').value = roomType;

    // 날짜 입력 필드
    const checkinInput = document.getElementById('checkinDt');
    const checkoutInput = document.getElementById('checkoutDt');

    // 초기에 체크아웃 날짜 선택 비활성화
    checkoutInput.disabled = true;

    // 오늘 날짜 구하기
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 체크인 날짜 제한 설정
    checkinInput.min = todayStr;

    let reservations = []; // 예약 데이터를 저장할 변수

    // 해당 방의 예약 내역 조회
    fetch('/api/reservation/all')
        .then(response => response.json())
        .then(data => {
            // 현재 선택된 방의 예약만 필터링
            reservations = data.filter(reservation => 
                reservation.roomNumber === document.getElementById('roomNumber').value
            );
            console.log('Filtered reservations for room', roomNumber, ':', reservations); // 디버깅
            
            // 체크인 날짜 변경 이벤트 리스너
            checkinInput.addEventListener('change', function() {
                const selectedCheckin = new Date(this.value);
                
                // 체크인 날짜 다음 날 계산
                const nextDay = new Date(selectedCheckin);
                nextDay.setDate(selectedCheckin.getDate() + 1);
                
                // 체크인 날짜로부터 7일 후 계산
                const maxDay = new Date(selectedCheckin);
                maxDay.setDate(selectedCheckin.getDate() + 7);
                
                // 체크아웃 입력 활성화 및 날짜 제한 설정
                checkoutInput.disabled = false;
                checkoutInput.min = nextDay.toISOString().split('T')[0];
                checkoutInput.max = maxDay.toISOString().split('T')[0];
                checkoutInput.value = ''; // 체크아웃 날짜 초기화
            });
        })
        .catch(error => {
            console.error('Error fetching reservations:', error);
            alert('예약 정보를 불러오는데 실패했습니다.');
        });

    // 예약 폼 제출 처리
    document.getElementById('reservationForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const checkinDate = new Date(document.getElementById('checkinDt').value);
        const checkoutDate = new Date(document.getElementById('checkoutDt').value);
        const roomNumber = document.getElementById('roomNumber').value;

        console.log('예약 시도 - 방번호:', roomNumber); // 디버깅
        console.log('체크인:', checkinDate, '체크아웃:', checkoutDate); // 디버깅

        // 체크인과 체크아웃 사이의 일수 계산
        const daysDiff = Math.floor((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
        console.log('예약 일수:', daysDiff); // 디버깅
        
        // 7일 초과 체크
        if (daysDiff > 7) {
            alert('최대 7박까지 예약할 수 있습니다.');
            return;
        }

        try {
            // 해당 방의 예약 내역 조회
            const response = await fetch('/api/reservation/all');
            const reservations = await response.json();
            
            // 현재 방의 예약만 필터링
            const roomReservations = reservations.filter(reservation => 
                reservation.roomNumber === roomNumber
            );

            // 날짜 중복 검사
            const hasOverlap = roomReservations.some(reservation => {
                const existingCheckin = new Date(reservation.checkinDt);
                const existingCheckout = new Date(reservation.checkoutDt);

                return (checkinDate <= existingCheckout && checkoutDate >= existingCheckin);
            });

            if (hasOverlap) {
                alert('다른 예약 날짜와 겹칩니다.');
                return;
            }

            // 날짜 중복이 없으면 예약 진행
            const formData = {
                name: document.getElementById('name').value,
                roomNumber: roomNumber,
                roomType: document.getElementById('roomType').value,
                checkinDt: document.getElementById('checkinDt').value,
                checkoutDt: document.getElementById('checkoutDt').value
            };
            
            console.log('전송할 예약 데이터:', formData); // 디버깅

            const reservationResponse = await fetch('/api/reservation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('서버 응답 상태:', reservationResponse.status); // 디버깅

            if (!reservationResponse.ok) {
                throw new Error(`HTTP error! status: ${reservationResponse.status}`);
            }

            const reservationResult = await reservationResponse.json();
            console.log('서버 응답 데이터:', reservationResult); // 디버깅

            if (reservationResult.success) {
                alert('예약이 완료되었습니다.');
                window.location.href = '/dashboard';
            } else {
                alert(reservationResult.message || '예약에 실패했습니다.');
            }
        } catch (error) {
            console.error('예약 처리 중 상세 에러:', error); // 디버깅
            alert('예약 처리 중 오류가 발생했습니다: ' + error.message);
        }
    });

    // 취소 버튼 처리
    document.getElementById('cancelButton').addEventListener('click', function() {
        window.location.href = '/dashboard';
    });
});