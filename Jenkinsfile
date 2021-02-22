pipeline {
    agent { dockerfile true }
    stages {
	    stage('Build') {
            steps {
                echo 'Building Image ....'
            }
        }
		
        stage('Test') {
            steps {
                sh 'node --version'
            }
        }
		
		stage('Deploy') {
            steps {
                echo 'Deploying and running script 2....'
				echo 'here is env workspaces: ${env.WORKSPACE}'
				sh "chmod +x -R ${env.WORKSPACE}"
				sh './runDocker.sh'
            }
        }
    }
}