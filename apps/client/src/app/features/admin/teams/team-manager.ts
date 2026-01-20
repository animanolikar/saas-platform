import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeamsService } from '../../../core/services/teams.service';
import { UserService } from '../../../core/services/user.service';
import { FormsModule } from '@angular/forms';
import { PaginationService, PageState } from '../../../core/services/pagination.service';

@Component({
  selector: 'app-team-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-manager.html',
  styleUrls: ['./team-manager.css'],
})
export class TeamManagerComponent implements OnInit {
  allTeams: any[] = [];
  teams: any[] = [];
  loading = false;
  creating = false;

  // Pagination
  pager: PageState = {} as PageState;
  currentPage = 1;
  pageSize = 5; // Smaller page size for teams
  pages: number[] = [];

  // New Team Form
  newTeamName = '';
  newTeamDesc = '';
  error = '';
  success = '';

  // Manage Modal
  selectedTeam: any = null;
  teamMembers: any[] = [];
  availableUsers: any[] = [];
  filteredUsers: any[] = [];
  userSearchTerm: string = '';
  selectedUserIds: Set<string> = new Set();
  showManageModal = false;
  addingMembers = false;

  constructor(
    private teamsService: TeamsService,
    private userService: UserService,
    private paginationService: PaginationService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadTeams();
  }

  loadTeams() {
    this.loading = true;
    this.teamsService.getTeams().subscribe({
      next: (data) => {
        this.allTeams = data;
        this.setPage(1);
        this.loading = false;
        this.cd.detectChanges(); // Manually trigger change detection
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
        this.error = 'Failed to load teams';
        this.cd.detectChanges();
      }
    });
  }

  createTeam() {
    if (!this.newTeamName) return;

    this.creating = true;
    // Removed year and batch from call
    this.teamsService.createTeam(this.newTeamName, this.newTeamDesc).subscribe({
      next: (team) => {
        this.success = 'Team created successfully!';
        this.creating = false;
        this.newTeamName = '';
        this.newTeamDesc = '';
        this.loadTeams();
        setTimeout(() => this.success = '', 3000);
        this.cd.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create team';
        this.creating = false;
        this.cd.detectChanges();
      }
    })
  }

  manageTeam(team: any) {
    this.selectedTeam = team;
    this.showManageModal = true;
    this.loadMembers(team.id);
    this.loadAvailableUsers();
    this.userSearchTerm = '';
    this.cd.detectChanges();
  }

  closeManageModal() {
    this.showManageModal = false;
    this.selectedTeam = null;
    this.teamMembers = [];
    this.selectedUserIds.clear();
    this.userSearchTerm = '';
    this.filterYear = '';
    this.filterBatch = '';
    this.cd.detectChanges();
  }

  loadMembers(teamId: string) {
    this.teamsService.getTeam(teamId).subscribe({
      next: (team) => {
        // Flatten structure if needed, backend returns team with members
        this.teamMembers = team.members || [];
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.cd.detectChanges();
      }
    });
  }

  filterYear = '';
  filterBatch = '';

  academicYears: string[] = [];
  batches: string[] = [];

  loadAvailableUsers() {
    // Load filters first if not loaded
    if (this.academicYears.length === 0) {
      this.userService.getFilters().subscribe(data => {
        this.academicYears = data.academicYears;
        this.batches = data.batches;
        this.cd.detectChanges();
      });
    }

    this.userService.getUsers(this.filterYear, this.filterBatch).subscribe({
      next: (users) => {
        this.availableUsers = users;
        this.filterUsers();
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.cd.detectChanges();
      }
    });
  }

  applyFilters() {
    // Reload from backend with new filters
    this.loadAvailableUsers();
  }

  filterUsers() {
    if (!this.userSearchTerm) {
      this.filteredUsers = this.availableUsers;
    } else {
      const term = this.userSearchTerm.toLowerCase();
      this.filteredUsers = this.availableUsers.filter(u =>
        (u.firstName?.toLowerCase() || '').includes(term) ||
        (u.lastName?.toLowerCase() || '').includes(term) ||
        (u.email?.toLowerCase() || '').includes(term)
      );
    }
  }

  toggleSelection(userId: string) {
    if (this.selectedUserIds.has(userId)) {
      this.selectedUserIds.delete(userId);
    } else {
      this.selectedUserIds.add(userId);
    }
  }

  toggleSelectAll() {
    const allFilteredSelected = this.isAllSelected();

    if (allFilteredSelected) {
      // Deselect all filtered users
      this.filteredUsers.forEach(u => this.selectedUserIds.delete(u.id));
    } else {
      // Select all filtered users
      this.filteredUsers.forEach(u => this.selectedUserIds.add(u.id));
    }
    this.cd.detectChanges();
  }

  isAllSelected(): boolean {
    if (this.filteredUsers.length === 0) return false;
    return this.filteredUsers.every(u => this.selectedUserIds.has(u.id));
  }

  async addMembers() {
    if (this.selectedUserIds.size === 0 || !this.selectedTeam) return;

    this.addingMembers = true;
    const idsToAdd = Array.from(this.selectedUserIds);
    let successCount = 0;

    // Simple sequential add for now (could be Promise.all if backend supports concurrency)
    for (const userId of idsToAdd) {
      try {
        // We're converting Observable to Promise here for sequential execution to avoid flooding
        await new Promise<void>((resolve, reject) => {
          this.teamsService.addMember(this.selectedTeam.id, userId, 'MEMBER').subscribe({
            next: () => {
              successCount++;
              resolve();
            },
            error: (err) => {
              console.error(`Failed to add user ${userId}`, err);
              // Resolve anyway to continue
              resolve();
            }
          });
        });
      } catch (e) {
        console.error(e);
      }
    }

    this.addingMembers = false;
    this.selectedUserIds.clear();
    this.loadMembers(this.selectedTeam.id);
    this.loadTeams();
    this.cd.detectChanges();

    if (successCount > 0) {
      // Optional: show toast
    }
  }

  removeMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?') || !this.selectedTeam) return;

    this.teamsService.removeMember(this.selectedTeam.id, memberId).subscribe({
      next: () => {
        this.loadMembers(this.selectedTeam.id);
        this.loadTeams(); // Refresh counts
        this.cd.detectChanges();
      },
      error: (err) => {
        alert('Failed to remove member');
        this.cd.detectChanges();
      }
    });
  }

  setPage(page: number) {
    if (page < 1 || (this.pager.totalPages && page > this.pager.totalPages)) {
      return;
    }
    this.currentPage = page;
    this.pager = this.paginationService.paginate(this.allTeams, page, this.pageSize);
    this.teams = this.pager.pagedItems;
    this.pages = this.paginationService.getPages(this.pager.totalPages);
  }
}
