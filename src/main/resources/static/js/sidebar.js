function initializeSidebar() {
  const toggleButton = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('.main-content');

  if (toggleButton && sidebar && mainContent) {
    document.body.appendChild(toggleButton);

    // 초기 아이콘 상태 설정
    const updateIcon = () => {
      const icon = toggleButton.querySelector('i');
      if (window.innerWidth <= 991.98) {
        icon.className = sidebar.classList.contains('show') ?
          'fas fa-angles-left' : 'fas fa-angles-right';
      } else {
        icon.className = sidebar.classList.contains('collapsed') ?
          'fas fa-angles-right' : 'fas fa-angles-left';
      }
    };

    // 기존 이벤트 리스너에 아이콘 업데이트 추가
    toggleButton.addEventListener('click', function (e) {
      e.preventDefault();
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('expanded');
      updateIcon();
    });

    // 초기 상태 및 리사이즈 시 아이콘 업데이트
    updateIcon();
    window.addEventListener('resize', updateIcon);
  }

  // admin-only 요소들 체크 및 표시
  const adminElements = document.querySelectorAll('.admin-only');
  console.log('Found admin elements:', adminElements.length);

  fetch('/api/check-admin')
    .then(response => response.json())
    .then(data => {
      console.log('Admin check response:', data);
      if (data.isAdmin) {
        console.log('User is admin, showing admin elements');
        adminElements.forEach(el => {
          el.style.display = 'block';
          console.log('Showing element:', el);
        });
      } else {
        console.log('User is not admin');
      }
    })
    .catch(error => {
      console.error('Error checking admin status:', error);
      alert('관리자 권한 확인 중 오류가 발생했습니다: ' + error.message);
    });

  // 로그아웃 기능 추가
  const logoutLink = document.getElementById('nav-logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', function (e) {
      e.preventDefault();
      if (confirm('로그아웃 하시겠습니까?')) {
        fetch('/api/logout', {
          method: 'POST',
          credentials: 'same-origin'
        })
          .then(response => {
            if (response.ok) {
              window.location.href = '/';
            }
          })
          .catch(error => {
            console.error('Logout error:', error);
            alert('로그아웃 중 오류가 발생했습니다.');
          });
      }
    });
  }
}

// 페이지 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
  initializeSidebar();
}